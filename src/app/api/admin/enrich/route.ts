import { NextResponse } from 'next/server';
import { enrichLead } from '@/lib/enrichment';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') || '1505 Elm St, Dallas, TX 75201';

    try {
        const enrichedData = await enrichLead(address);

        return NextResponse.json({
            success: true,
            apiSet: !!process.env.SKIP_TRACING_API_KEY,
            keyPrefix: process.env.SKIP_TRACING_API_KEY ? `${process.env.SKIP_TRACING_API_KEY.substring(0, 5)}...` : 'none',
            addressTested: address,
            result: enrichedData
        });
    } catch (e: any) {
        return NextResponse.json({
            success: false,
            apiSet: !!process.env.SKIP_TRACING_API_KEY,
            error: e.message || String(e)
        });
    }
}
