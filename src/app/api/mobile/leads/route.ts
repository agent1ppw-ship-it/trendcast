import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileAuthFromRequest } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await getMobileAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '50'), 1), 200);

  const leads = await prisma.lead.findMany({
    where: { orgId: auth.orgId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      status: true,
      source: true,
      leadScore: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, leads });
}

export async function POST(request: Request) {
  const auth = await getMobileAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    phone?: string;
    address?: string;
    source?: string;
  };

  const name = body.name?.trim() || '';
  if (!name) {
    return NextResponse.json({ success: false, error: 'Lead name is required.' }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      orgId: auth.orgId,
      name,
      phone: body.phone?.trim() || null,
      address: body.address?.trim() || null,
      source: body.source?.trim() || 'MOBILE',
      status: 'NEW',
    },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      status: true,
      source: true,
      leadScore: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, lead });
}
