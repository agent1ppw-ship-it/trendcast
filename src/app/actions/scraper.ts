'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { revalidatePath } from 'next/cache';
import { ensureOrganization } from '@/app/actions/auth';
import { getScraperExtractCost, refundScraperExtractsOnce } from '@/lib/scraperCredits';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {})
});

const scrapeQueue = new Queue('ScrapeQueue', { connection: redisConnection as never });
import { prisma } from '@/lib/prisma';

export type ScraperListingType = 'RECENTLY_SOLD' | 'RECENTLY_LISTED';

export async function startScraperJob(zipCode: string, listingType: ScraperListingType = 'RECENTLY_SOLD') {
    let orgId: string | null = null;
    let extractsDeducted = false;

    try {
        orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized. Please sign in.' };

        const org = await prisma.organization.findUnique({
            where: { id: orgId }
        });

        if (!org) {
            return { success: false, error: 'No active organization found' };
        }

        if (org.extracts < getScraperExtractCost()) {
            return {
                success: false,
                error: 'You need at least 10 extracts to run a batch. Please upgrade or add more extracts to continue generating leads.',
                errorCode: 'UPGRADE_REQUIRED'
            };
        }

        // Deduct extracts upfront, then refund automatically if queueing or execution fails.
        await prisma.organization.update({
            where: { id: org.id },
            data: { extracts: { decrement: getScraperExtractCost() } }
        });
        extractsDeducted = true;

        const job = await scrapeQueue.add('scrape-job', {
            zipCode,
            orgId: org.id,
            listingType,
        });

        return {
            success: true,
            message: `Scraper queued for ${zipCode} (${listingType === 'RECENTLY_LISTED' ? 'recently listed' : 'recently sold'}). ${getScraperExtractCost()} extracts reserved.`,
            jobId: job.id,
        };
    } catch (error) {
        console.error('Failed to queue scraper job:', error);
        if (extractsDeducted && orgId) {
            await prisma.organization.update({
                where: { id: orgId },
                data: { extracts: { increment: getScraperExtractCost() } }
            }).catch((refundError) => {
                console.error('Failed to refund extracts after queue error:', refundError);
            });
        }
        const redisIsSet = !!process.env.REDIS_URL;
        return {
            success: false,
            error: `Connection Failed. Vercel REDIS_URL Configured?: ${redisIsSet}. Error trace: ${error instanceof Error ? error.message : 'Unknown Network Timeout'}`
        };
    }
}

export async function getScraperStatus(jobId: string) {
    try {
        const job = await scrapeQueue.getJob(jobId);
        if (!job) return { success: false, error: 'Job not found' };

        const state = await job.getState();
        return {
            success: true,
            state,
            progress: job.progress
        };
    } catch (error) {
        console.error('Failed to get scraper status:', error);
        return { success: false, error: 'Failed to fetch job status' };
    }
}

export async function syncLeadToCrm(leadId: string) {
    try {
        const orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized' };

        await prisma.lead.updateMany({
            where: { id: leadId, orgId: orgId },
            data: { status: 'NEW' }
        });
        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/crm');
        return { success: true };
    } catch (error) {
        console.error('Failed to sync lead:', error);
        return { success: false, error: 'Failed to sync lead' };
    }
}

export async function syncAllExtractedToCrm() {
    try {
        const orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized' };

        const result = await prisma.lead.updateMany({
            where: { status: 'EXTRACTED', orgId: orgId },
            data: { status: 'NEW' }
        });
        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/crm');
        return { success: true, count: result.count };
    } catch (error) {
        console.error('Failed to sync leads:', error);
        return { success: false, error: 'Failed to sync leads' };
    }
}

export async function cancelScraperJob(jobId: string) {
    try {
        const orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized' };

        // Flag the job for cancellation in Redis
        await redisConnection.set(`cancel-job:${jobId}`, '1', 'EX', 3600);

        // Remove from memory queue if it hasn't actually booted into the Worker yet
        const job = await scrapeQueue.getJob(jobId);
        if (job) {
            const state = await job.getState();
            if (state === 'waiting' || state === 'delayed') {
                await job.remove();
            }
        }

        await refundScraperExtractsOnce(redisConnection, jobId, orgId);

        return { success: true };
    } catch (error) {
        console.error('Failed to cancel scraper job:', error);
        return { success: false, error: 'Failed to cancel job' };
    }
}
