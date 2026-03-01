import { redirect } from 'next/navigation';
import { ensureOrganization } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import { BusinessFinderClient } from '@/components/BusinessFinderClient';

export const dynamic = 'force-dynamic';

export default async function BusinessesPage() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    const [org, crmLeadCount] = await Promise.all([
        prisma.organization.findUnique({
            where: { id: orgId },
            select: { industry: true },
        }),
        prisma.lead.count({
            where: { orgId, status: { not: 'EXTRACTED' } },
        }),
    ]);

    return (
        <BusinessFinderClient
            defaultIndustry={org?.industry || 'Roofing'}
            crmLeadCount={crmLeadCount}
        />
    );
}
