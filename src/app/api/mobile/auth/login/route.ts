import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signMobileToken } from '@/lib/mobileAuth';
import { ensureUserOrganizationByEmail } from '@/lib/organizationProvisioning';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() || '';
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials or this account uses social login only.' },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials.' }, { status: 401 });
    }

    let orgId = user.orgId;
    if (!orgId && user.email) {
      orgId = await ensureUserOrganizationByEmail(user.email);
    }

    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found for this user.' }, { status: 403 });
    }

    const token = await signMobileToken({
      userId: user.id,
      email,
      orgId,
      role: user.role || 'USER',
    });

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        tier: true,
        credits: true,
        extracts: true,
      },
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email,
        name: user.name,
        role: user.role,
      },
      organization,
    });
  } catch (error) {
    console.error('Mobile auth login failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to sign in.' }, { status: 500 });
  }
}
