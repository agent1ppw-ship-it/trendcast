'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { ensureOrganization } from '@/app/actions/auth';
import type {
    BusinessFinderExtractionDiagnostics,
    BusinessFinderLead,
    BusinessFinderMatchStrategy,
} from '@/lib/businessFinder';
import { getSafeSearchRadiusMiles } from '@/lib/businessFinder';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
});

const businessFinderQueue = new Queue('BusinessFinderQueue', { connection: redisConnection as never });

interface BusinessFinderProgress {
    phase: string;
    percent: number;
    finalUrl?: string;
    pageTitle?: string;
    blocked?: boolean;
    usedCache?: boolean;
    extractionDiagnostics?: BusinessFinderExtractionDiagnostics;
}

interface BusinessFinderJobResult {
    leads: BusinessFinderLead[];
    matchStrategy: BusinessFinderMatchStrategy;
    sourceLabel: string;
    searchUrl: string;
    usedCache?: boolean;
    finalUrl?: string;
    pageTitle?: string;
    blocked?: boolean;
    blockReason?: string;
    diagnostics?: BusinessFinderExtractionDiagnostics;
}

export async function startBusinessSearchJob(zipCode: string, industry: string, batchSize: number, radiusMiles: number) {
    const normalizedZip = zipCode.trim();
    const normalizedIndustry = industry.trim();
    const safeBatchSize = Math.min(Math.max(batchSize, 1), 100);
    const safeRadiusMiles = getSafeSearchRadiusMiles(radiusMiles);

    if (!/^\d{5}$/.test(normalizedZip)) {
        return { success: false, error: 'Enter a valid 5-digit ZIP code.' };
    }

    if (!normalizedIndustry) {
        return { success: false, error: 'Choose an industry to search.' };
    }

    const orgId = await ensureOrganization();
    if (!orgId) {
        return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    try {
        const job = await businessFinderQueue.add('business-search-job', {
            orgId,
            zipCode: normalizedZip,
            industry: normalizedIndustry,
            batchSize: safeBatchSize,
            radiusMiles: safeRadiusMiles,
        });

        return { success: true, jobId: String(job.id) };
    } catch (error) {
        console.error('Failed to queue business finder job:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to start business search.',
        };
    }
}

export async function getBusinessSearchStatus(jobId: string) {
    try {
        const job = await businessFinderQueue.getJob(jobId);
        if (!job) return { success: false, error: 'Job not found.' };

        const state = await job.getState();
        const progress = (job.progress as BusinessFinderProgress) || { phase: 'Queued', percent: 0 };
        const returnValue = (job.returnvalue as BusinessFinderJobResult | undefined) || undefined;

        return {
            success: true,
            state,
            progress,
            results: returnValue?.leads,
            matchStrategy: returnValue?.matchStrategy,
            sourceLabel: returnValue?.sourceLabel,
            searchUrl: returnValue?.searchUrl,
            usedCache: returnValue?.usedCache,
            finalUrl: returnValue?.finalUrl,
            pageTitle: returnValue?.pageTitle,
            blocked: returnValue?.blocked,
            blockReason: returnValue?.blockReason,
            diagnostics: returnValue?.diagnostics,
        };
    } catch (error) {
        console.error('Failed to fetch business finder job status:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get business search status.',
        };
    }
}
