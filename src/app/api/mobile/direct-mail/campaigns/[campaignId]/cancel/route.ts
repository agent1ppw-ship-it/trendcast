import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileAuthFromRequest } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
    const auth = await getMobileAuthFromRequest(request);
    if (!auth) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId } = await params;

    await prisma.mailCampaign.updateMany({
        where: {
            id: campaignId,
            orgId: auth.orgId,
        },
        data: {
            status: 'CANCELLED',
        },
    });

    return NextResponse.json({ success: true });
}
