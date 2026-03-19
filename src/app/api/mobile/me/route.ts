import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileAuthFromRequest } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await getMobileAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [user, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        orgId: true,
      },
    }),
    prisma.organization.findUnique({
      where: { id: auth.orgId },
      select: {
        id: true,
        name: true,
        industry: true,
        tier: true,
        credits: true,
        extracts: true,
      },
    }),
  ]);

  if (!user || user.orgId !== auth.orgId || !organization) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    user,
    organization,
  });
}
