import IORedis from 'ioredis';
import * as dotenv from 'dotenv';
dotenv.config();

const redisUrl = process.env.REDIS_URL || '';
const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {})
});

async function tail() {
    console.log(`Pinging Upstash: ${redisUrl.substring(0, 25)}...`);

    try {
        const failedIds = await redis.lrange('bull:ScrapeQueue:failed', 0, 5);
        if (failedIds.length === 0) {
            console.log('No failed jobs found in the queue.');
            return;
        }

        console.log('--- FOUND FAILED JOBS:', failedIds, '---');
        const jobData: any = await redis.hgetall(`bull:ScrapeQueue:${failedIds[0]}`);

        console.log('\n--- EXACT RENDER WORKER CRASH TRACE ---');
        console.log('Progress:', jobData.progress);
        console.log('Reason:', jobData.failedReason);
        console.log('Stack:', jobData.stacktrace ? jobData.stacktrace.substring(0, 500) : 'none');
    } catch (e: any) {
        console.error('Failed to query Redis:', e.message);
    } finally {
        redis.disconnect();
    }
}
tail();
