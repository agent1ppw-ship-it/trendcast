import { NextResponse } from 'next/server';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';

export const dynamic = 'force-dynamic';

export async function GET() {
    const url = process.env.REDIS_URL || '';
    
    const redis = new IORedis(url, {
        maxRetriesPerRequest: null,
        connectTimeout: 3000,
        ...(url.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {})
    });

    const queue = new Queue('ScrapeQueue', { connection: redis as any });

    try {
        const failedJobs = await queue.getFailed(0, 100);
        if (failedJobs.length === 0) {
            return NextResponse.json({ success: true, message: 'No failed jobs found in the queue.' });
        }

        // Get the very last (newest/most recent) failed job in the array
        const job = failedJobs[failedJobs.length - 1];
        
        return NextResponse.json({
            success: true,
            jobId: job.id,
            progress: job.progress || 'Unknown',
            reason: job.failedReason || 'Unknown',
            stack: job.stacktrace ? job.stacktrace[0] || 'None' : 'None'
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    } finally {
        await queue.close();
        redis.disconnect();
    }
}
