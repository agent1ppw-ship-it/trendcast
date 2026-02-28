import { PrismaClient, Lead } from '@prisma/client';
import { LeadScraperClient } from '@/components/LeadScraperClient';
import { ensureOrganization } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';

export default async function LeadScraperPage() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    let leads: Lead[] = [];

    try {
        leads = await prisma.lead.findMany({
            where: {
                orgId: orgId,
                source: 'SCRAPER',
                status: 'EXTRACTED'
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });
    } catch (error) {
        console.error("Failed to fetch scraped leads:", error);
    }

    return <LeadScraperClient initialLeads={leads} />;
}
