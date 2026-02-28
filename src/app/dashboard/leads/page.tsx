import { PrismaClient, Lead } from '@prisma/client';
import { LeadScraperClient } from '@/components/LeadScraperClient';
import { verifyAuth } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export default async function LeadScraperPage() {
    const session = await verifyAuth();
    if (!session) redirect('/signup');

    let leads: Lead[] = [];

    try {
        leads = await prisma.lead.findMany({
            where: {
                orgId: session.orgId,
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
