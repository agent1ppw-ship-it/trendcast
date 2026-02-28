import { NextResponse } from 'next/server';
import IORedis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET() {
    const url = process.env.REDIS_URL || '';

    // Test 1: With the custom TLS object
    const redis = new IORedis(url, {
        maxRetriesPerRequest: null,
        connectTimeout: 3000,
        ...(url.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {})
    });

    try {
        const failedIds = await redis.lrange('bull:ScrapeQueue:failed', 0, 5);
        if (failedIds.length === 0) {
            return NextResponse.json({ success: true, message: 'No failed jobs found in the queue.' });
        }

        const jobData: any = await redis.hgetall(`bull:ScrapeQueue:${failedIds[0]}`);

        return NextResponse.json({
            success: true,
            jobId: failedIds[0],
            progress: jobData.progress || 'Unknown',
            reason: jobData.failedReason || 'Unknown',
            stack: jobData.stacktrace ? jobData.stacktrace.substring(0, 1000) : 'None'
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    } finally {
        redis.disconnect();
    }
}
