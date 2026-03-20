import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWebsiteBuildInquiryNotification } from '@/lib/websiteBuildInquiryEmail';

export const dynamic = 'force-dynamic';

const INTERNAL_ORG_NAME = 'Trendcast Website Inquiries';

function clean(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

async function getOrCreateInternalInquiryOrg() {
    const existing = await prisma.organization.findFirst({
        where: {
            name: INTERNAL_ORG_NAME,
        },
        select: {
            id: true,
        },
    });

    if (existing) {
        return existing.id;
    }

    const created = await prisma.organization.create({
        data: {
            name: INTERNAL_ORG_NAME,
            tier: 'ENTERPRISE',
            industry: 'Internal Sales',
            credits: 0,
            extracts: 0,
        },
        select: {
            id: true,
        },
    });

    return created.id;
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as Record<string, unknown>;

        const name = clean(body.name);
        const email = clean(body.email);
        const phone = clean(body.phone);
        const businessName = clean(body.businessName);
        const industry = clean(body.industry);
        const cityState = clean(body.cityState);
        const currentWebsite = clean(body.currentWebsite);
        const notes = clean(body.notes);

        if (!name || !email || !phone || !businessName || !industry) {
            return NextResponse.json(
                { success: false, error: 'Name, email, phone, business name, and industry are required.' },
                { status: 400 },
            );
        }

        const orgId = await getOrCreateInternalInquiryOrg();

        const details = [
            `Business: ${businessName}`,
            `Industry: ${industry}`,
            cityState ? `Location: ${cityState}` : null,
            `Email: ${email}`,
            currentWebsite ? `Current Website: ${currentWebsite}` : null,
            notes ? `Notes: ${notes}` : null,
        ]
            .filter(Boolean)
            .join(' | ');

        const notificationResult = await sendWebsiteBuildInquiryNotification({
            name,
            email,
            phone,
            businessName,
            industry,
            cityState,
            currentWebsite,
            notes,
        });

        const lead = await prisma.lead.create({
            data: {
                orgId,
                name,
                phone,
                address: details,
                source: 'WEBSITE_BUILD_INQUIRY',
                status: 'NEW',
            },
            select: {
                id: true,
            },
        });

        return NextResponse.json({
            success: true,
            inquiryId: lead.id,
            emailNotificationSent: notificationResult.sent,
        });
    } catch (error) {
        console.error('Website build inquiry failed:', error);
        return NextResponse.json({ success: false, error: 'Failed to submit inquiry.' }, { status: 500 });
    }
}
