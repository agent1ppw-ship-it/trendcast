import { redirect } from 'next/navigation';
import { ensureOrganization } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import { VisualEstimatorClient } from '@/components/VisualEstimatorClient';

export const dynamic = 'force-dynamic';

export default async function VisualEstimatorPage() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { industry: true },
    });

    return <VisualEstimatorClient defaultIndustry={org?.industry || 'Home Services'} />;
}

