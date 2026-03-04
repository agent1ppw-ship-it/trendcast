export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { ensureOrganization } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_MAIL_TEMPLATES, getDirectMailMode, getLobEnvironment } from '@/lib/directMail';
import { DirectMailDashboardClient } from '@/components/DirectMailDashboardClient';

export default async function DirectMailPage() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    const existingTemplateCount = await prisma.mailTemplate.count({
        where: { orgId },
    });

    if (existingTemplateCount === 0) {
        await prisma.mailTemplate.createMany({
            data: DEFAULT_MAIL_TEMPLATES.map((template) => ({
                orgId,
                ...template,
            })),
        });
    }

    const [organization, templates, campaigns, leads] = await Promise.all([
        prisma.organization.findUnique({
            where: { id: orgId },
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
            where: { orgId },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'desc' },
            ],
        }),
        prisma.mailCampaign.findMany({
            where: { orgId },
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
                orders: {
                    where: {
                        lobObjectId: {
                            not: null,
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 3,
                    select: {
                        lobObjectId: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        }),
        prisma.lead.findMany({
            where: {
                orgId,
                address: {
                    not: null,
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 250,
        }),
    ]);

    return (
        <DirectMailDashboardClient
            mailMode={getDirectMailMode()}
            lobEnvironment={getLobEnvironment()}
            senderProfile={{
                mailFromName: organization?.mailFromName || '',
                mailFromCompany: organization?.mailFromCompany || '',
                mailAddressLine1: organization?.mailAddressLine1 || '',
                mailAddressLine2: organization?.mailAddressLine2 || '',
                mailCity: organization?.mailCity || '',
                mailState: organization?.mailState || '',
                mailZip: organization?.mailZip || '',
            }}
            leads={leads.map((lead) => ({
                id: lead.id,
                name: lead.name,
                address: lead.address,
                source: lead.source,
                status: lead.status,
                createdAt: lead.createdAt.toISOString(),
            }))}
            templates={templates.map((template) => ({
                id: template.id,
                name: template.name,
                type: template.type,
                size: template.size,
                frontHeadline: template.frontHeadline,
                frontBody: template.frontBody,
                backHeadline: template.backHeadline,
                backBody: template.backBody,
                ctaText: template.ctaText,
                accentColor: template.accentColor,
                imageUrl: template.imageUrl,
                isDefault: template.isDefault,
            }))}
            campaigns={campaigns.map((campaign) => ({
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                stripePaymentStatus: campaign.stripePaymentStatus || null,
                costCents: campaign.costCents,
                sentCount: campaign.sentCount,
                failedCount: campaign.failedCount,
                postageClass: campaign.postageClass,
                createdAt: campaign.createdAt.toISOString(),
                scheduledAt: campaign.scheduledAt?.toISOString() || null,
                template: campaign.template,
                orderCount: campaign._count.orders,
                recentLobIds: campaign.orders
                    .map((order) => order.lobObjectId)
                    .filter((lobObjectId): lobObjectId is string => Boolean(lobObjectId)),
            }))}
        />
    );
}
