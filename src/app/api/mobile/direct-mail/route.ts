import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileAuthFromRequest } from '@/lib/mobileAuth';
import { DEFAULT_MAIL_TEMPLATES, getDirectMailMode } from '@/lib/directMail';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await getMobileAuthFromRequest(request);
    if (!auth) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const existingTemplateCount = await prisma.mailTemplate.count({
            where: { orgId: auth.orgId },
        });

        if (existingTemplateCount === 0) {
            await prisma.mailTemplate.createMany({
                data: DEFAULT_MAIL_TEMPLATES.map((template) => ({
                    orgId: auth.orgId,
                    ...template,
                })),
            });
        }

        const [organization, templates, campaigns, leads] = await Promise.all([
            prisma.organization.findUnique({
                where: { id: auth.orgId },
                select: {
                    mailFromName: true,
                    mailFromCompany: true,
                    mailAddressLine1: true,
                    mailAddressLine2: true,
                    mailCity: true,
                    mailState: true,
                    mailZip: true,
                },
            }),
            prisma.mailTemplate.findMany({
                where: { orgId: auth.orgId },
                orderBy: [
                    { isDefault: 'desc' },
                    { createdAt: 'desc' },
                ],
            }),
            prisma.mailCampaign.findMany({
                where: { orgId: auth.orgId },
                include: {
                    template: {
                        select: {
                            name: true,
                            size: true,
                        },
                    },
                    _count: {
                        select: {
                            orders: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            }),
            prisma.lead.findMany({
                where: {
                    orgId: auth.orgId,
                    address: {
                        not: null,
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 150,
            }),
        ]);

        return NextResponse.json({
            success: true,
            mailMode: getDirectMailMode(),
            senderProfile: {
                mailFromName: organization?.mailFromName || '',
                mailFromCompany: organization?.mailFromCompany || '',
                mailAddressLine1: organization?.mailAddressLine1 || '',
                mailAddressLine2: organization?.mailAddressLine2 || '',
                mailCity: organization?.mailCity || '',
                mailState: organization?.mailState || '',
                mailZip: organization?.mailZip || '',
            },
            leads: leads.map((lead) => ({
                id: lead.id,
                name: lead.name,
                address: lead.address,
                source: lead.source,
                status: lead.status,
                createdAt: lead.createdAt.toISOString(),
            })),
            templates: templates.map((template) => ({
                id: template.id,
                name: template.name,
                size: template.size,
                type: template.type,
                accentColor: template.accentColor,
                frontHeadline: template.frontHeadline,
                frontBody: template.frontBody,
                backHeadline: template.backHeadline,
                backBody: template.backBody,
                ctaText: template.ctaText,
                isDefault: template.isDefault,
            })),
            campaigns: campaigns.map((campaign) => ({
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                postageClass: campaign.postageClass,
                costCents: campaign.costCents,
                sentCount: campaign.sentCount,
                failedCount: campaign.failedCount,
                stripePaymentStatus: campaign.stripePaymentStatus || null,
                createdAt: campaign.createdAt.toISOString(),
                scheduledAt: campaign.scheduledAt?.toISOString() || null,
                orderCount: campaign._count.orders,
                template: campaign.template,
            })),
        });
    } catch (error) {
        console.error('Mobile direct mail data failed:', error);
        return NextResponse.json({ success: false, error: 'Failed to load direct mail data.' }, { status: 500 });
    }
}
