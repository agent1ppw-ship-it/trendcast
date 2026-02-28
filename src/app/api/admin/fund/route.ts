import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user || !user.orgId) {
            return NextResponse.json({ success: false, error: 'User or org not found' }, { status: 404 });
        }

        const org = await prisma.organization.update({
            where: { id: user.orgId },
            data: { extracts: 1000 }
        });

        return NextResponse.json({ success: true, message: `Funded ${org.name} with ${org.extracts} extracts` });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
    }
}
