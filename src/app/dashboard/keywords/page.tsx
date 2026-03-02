import { redirect } from 'next/navigation';
import { ensureOrganization } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import { KeywordOpportunityClient } from '@/components/KeywordOpportunityClient';

export const dynamic = 'force-dynamic';

export default async function KeywordsPage() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { industry: true },
    });

    return <KeywordOpportunityClient defaultIndustry={org?.industry || 'Roofing'} />;
}
