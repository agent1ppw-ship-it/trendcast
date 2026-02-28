import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enrichLead } from '@/lib/enrichment';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const lead = await prisma.lead.findFirst({
            where: { status: 'NEW' },
            include: { organization: true }
        });

        if (!lead) return NextResponse.json({ success: false, error: 'Lead not found.', details: "findFirst returned null" });
        if (lead.isRevealed) return NextResponse.json({ success: false, error: 'Lead is already revealed.' });
        if (lead.organization.credits < 50) return NextResponse.json({ success: false, error: `Insufficient credits! Credits: ${lead.organization.credits}` });
        if (!lead.address) return NextResponse.json({ success: false, error: 'No address to run skip tracing on.' });

        const enrichedData = await enrichLead(lead.address);

        if (!enrichedData || enrichedData.ownerName === 'Unknown' || !enrichedData.mobileNumber) {
            return NextResponse.json({ success: false, error: 'Enrichment blocked reveal transaction.', details: enrichedData });
        }

        return NextResponse.json({ success: true, message: "Transaction would succeed.", enriched: enrichedData });

    } catch (e: any) {
        return NextResponse.json({
            success: false,
            error: 'Server Exception',
            details: e.message || String(e),
            stack: e.stack ? e.stack.split('\n')[0] : 'None'
        });
    }
}
