import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calculateMailCost } from '@/lib/directMail';
import { getMobileAuthFromRequest } from '@/lib/mobileAuth';

type MailSize = '4X6' | '6X9' | '8_5X11';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const auth = await getMobileAuthFromRequest(request);
    if (!auth) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
        name?: string;
        templateId?: string;
        leadIds?: string[];
        scheduledAt?: string | null;
        postageClass?: 'MARKETING' | 'FIRST_CLASS';
    };

    const name = body.name?.trim() || '';
    const leadIds = Array.from(new Set(body.leadIds || [])).filter(Boolean);

    if (!name) {
        return NextResponse.json({ success: false, error: 'Campaign name is required.' }, { status: 400 });
    }

    if (!body.templateId) {
        return NextResponse.json({ success: false, error: 'Template is required.' }, { status: 400 });
    }

    if (leadIds.length === 0) {
        return NextResponse.json({ success: false, error: 'Select at least one lead.' }, { status: 400 });
    }

    const template = await prisma.mailTemplate.findFirst({
        where: { id: body.templateId, orgId: auth.orgId },
    });

    if (!template) {
        return NextResponse.json({ success: false, error: 'Template not found.' }, { status: 404 });
    }

    const leads = await prisma.lead.findMany({
        where: {
            orgId: auth.orgId,
            id: { in: leadIds },
        },
        select: {
            id: true,
            address: true,
        },
    });

    const validLeadIds = leads.filter((lead) => !!lead.address).map((lead) => lead.id);
    if (validLeadIds.length === 0) {
        return NextResponse.json({ success: false, error: 'None of the selected leads have a mailing address.' }, { status: 400 });
    }

    const postageClass = template.size === '4X6'
        ? 'FIRST_CLASS'
        : (body.postageClass || 'MARKETING');
    const cost = calculateMailCost(template.size as MailSize, validLeadIds.length);

    const campaign = await prisma.mailCampaign.create({
        data: {
            orgId: auth.orgId,
            templateId: template.id,
            name,
            targetType: 'CUSTOM',
            targetLeadIds: validLeadIds as unknown as Prisma.InputJsonValue,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
            postageClass,
            mailType: template.type,
            mailSize: template.size,
            costCents: cost.totalCustomerCents,
            status: body.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        },
    });

    return NextResponse.json({ success: true, campaignId: campaign.id });
}
