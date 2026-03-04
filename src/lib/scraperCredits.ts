import { prisma } from './prisma';

const SCRAPER_EXTRACT_COST = 10;
const SCRAPER_REFUND_TTL_SECONDS = 60 * 60 * 24;

type RedisSetCapable = {
    set: (
        key: string,
        value: string,
        mode: 'EX',
        durationSeconds: number,
        condition: 'NX',
    ) => Promise<'OK' | null>;
};

export function getScraperExtractCost() {
    return SCRAPER_EXTRACT_COST;
}

export async function refundScraperExtractsOnce(
    redis: RedisSetCapable,
    jobId: string,
    orgId: string,
) {
    const lockKey = `scrape-refund:${jobId}`;
    const lockResult = await redis.set(lockKey, '1', 'EX', SCRAPER_REFUND_TTL_SECONDS, 'NX');

    if (lockResult !== 'OK') {
        return false;
    }

    await prisma.organization.update({
        where: { id: orgId },
        data: {
            extracts: { increment: SCRAPER_EXTRACT_COST },
        },
    });

    return true;
}
