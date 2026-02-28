'use server';

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ensureOrganization } from '@/app/actions/auth';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {})
});

const scrapeQueue = new Queue('ScrapeQueue', { connection: redisConnection as any });
const prisma = new PrismaClient();

export async function startScraperJob(zipCode: string) {
    try {
        const orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized. Please sign in.' };

        const org = await prisma.organization.findUnique({
            where: { id: orgId }
        });

        if (!org) {
            return { success: false, error: 'No active organization found' };
        }

        if (org.extracts <= 9) {
            return {
                success: false,
                error: 'You need at least 10 Free Trial extracts to run a batch! Please subscribe to the Intro Tier to continue generating leads.',
                errorCode: 'UPGRADE_REQUIRED'
            };
        }

        // Deduct exactly 10 extracts upfront for this batch job
        await prisma.organization.update({
            where: { id: org.id },
            data: { extracts: { decrement: 10 } }
        });

        const job = await scrapeQueue.add('scrape-job', {
            zipCode,
            orgId: org.id
        });

        return { success: true, message: `Scraper queued for ${zipCode}. 10 Extracts deducted.`, jobId: job.id };
    } catch (error) {
        console.error('Failed to queue scraper job:', error);
        return { success: false, error: 'Failed to connect to Redis queue' };
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

        // Refund the 10 upfront extracts back to the User
        await prisma.organization.update({
            where: { id: orgId },
            data: { extracts: { increment: 10 } }
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to cancel scraper job:', error);
        return { success: false, error: 'Failed to cancel job' };
    }
}
