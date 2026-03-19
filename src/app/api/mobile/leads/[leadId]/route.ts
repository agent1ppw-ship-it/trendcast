import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileAuthFromRequest } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST', 'EXTRACTED'] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const auth = await getMobileAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { leadId } = await params;
  const body = (await request.json()) as { status?: string };
  const nextStatus = (body.status || '').trim().toUpperCase();

  if (!LEAD_STATUSES.includes(nextStatus as (typeof LEAD_STATUSES)[number])) {
    return NextResponse.json({ success: false, error: 'Invalid lead status.' }, { status: 400 });
  }

  const update = await prisma.lead.updateMany({
    where: {
      id: leadId,
      orgId: auth.orgId,
    },
    data: {
      status: nextStatus,
    },
  });

  if (update.count === 0) {
    return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
