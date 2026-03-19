import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileAuthFromRequest } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const auth = await getMobileAuthFromRequest(request);
    if (!auth) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
        mailFromName?: string;
        mailFromCompany?: string;
        mailAddressLine1?: string;
        mailAddressLine2?: string;
        mailCity?: string;
        mailState?: string;
        mailZip?: string;
    };

    const normalizedState = body.mailState?.trim().toUpperCase() || '';
    const normalizedZip = body.mailZip?.trim() || '';

    if (!body.mailAddressLine1?.trim() || !body.mailCity?.trim() || !normalizedState || !normalizedZip) {
        return NextResponse.json({ success: false, error: 'Address line 1, city, state, and ZIP are required.' }, { status: 400 });
    }

    if (!body.mailFromName?.trim() && !body.mailFromCompany?.trim()) {
        return NextResponse.json({ success: false, error: 'Add at least a sender name or company name.' }, { status: 400 });
    }

    await prisma.organization.update({
        where: { id: auth.orgId },
        data: {
            mailFromName: body.mailFromName?.trim() || null,
            mailFromCompany: body.mailFromCompany?.trim() || null,
            mailAddressLine1: body.mailAddressLine1.trim(),
            mailAddressLine2: body.mailAddressLine2?.trim() || null,
            mailCity: body.mailCity.trim(),
            mailState: normalizedState,
            mailZip: normalizedZip,
        },
    });

    return NextResponse.json({ success: true });
}
