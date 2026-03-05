export const dynamic = 'force-dynamic';
import { CrmCommandCenterClient } from '@/components/CrmCommandCenterClient';

import { ensureOrganization } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';

async function getLeads(orgId: string) {
    try {
        return await prisma.lead.findMany({
            where: { orgId },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error("Database connection failed. Serving mock leads instead.", error);
        return [];
    }
}

export default async function CrmDashboard() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    const leads = await getLeads(orgId);
    return (
        <CrmCommandCenterClient
            initialLeads={leads.map((lead) => ({
                ...lead,
                createdAt: lead.createdAt.toISOString(),
            }))}
        />
    );
}
