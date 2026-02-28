import { NextResponse } from 'next/server';
import IORedis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET() {
    const url = process.env.REDIS_URL || '';

    const results: any = { urlPrefix: url.substring(0, 15) };

    try {
        // Test 1: With the custom TLS object
        const client1 = new IORedis(url, {
            maxRetriesPerRequest: null,
            connectTimeout: 3000,
            ...(url.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {})
        });

        const start1 = Date.now();
        await client1.ping();
        results.tlsHack = `Success (${Date.now() - start1}ms)`;
        client1.disconnect();
    } catch (e: any) {
        results.tlsHack = `Failed: ${e.message}`;
    }

    try {
        // Test 2: Native rediss:// alone
        const client2 = new IORedis(url, {
            maxRetriesPerRequest: null,
            connectTimeout: 3000,
            family: 4 // Force IPv4
        });

        const start2 = Date.now();
        await client2.ping();
        results.nativeIpv4 = `Success (${Date.now() - start2}ms)`;
        client2.disconnect();
    } catch (e: any) {
        results.nativeIpv4 = `Failed: ${e.message}`;
    }

    try {
        // Test 3: Native rediss:// default family
        const client3 = new IORedis(url, {
            maxRetriesPerRequest: null,
            connectTimeout: 3000
        });

        const start3 = Date.now();
        await client3.ping();
        results.nativeAuto = `Success (${Date.now() - start3}ms)`;
        client3.disconnect();
    } catch (e: any) {
        results.nativeAuto = `Failed: ${e.message}`;
    }

    return NextResponse.json(results);
}
