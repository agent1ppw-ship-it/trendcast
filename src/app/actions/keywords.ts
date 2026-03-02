'use server';

import { ensureOrganization } from '@/app/actions/auth';
import { generateKeywordOpportunityReport } from '@/lib/ai/keywordOpportunities';

export async function generateKeywordIdeas(industry: string, location: string) {
    const normalizedIndustry = industry.trim();
    const normalizedLocation = location.trim();

    if (!normalizedIndustry) {
        return { success: false, error: 'Choose an industry to search.' };
    }

    if (!normalizedLocation) {
        return { success: false, error: 'Enter a ZIP code or city to search.' };
    }

    const orgId = await ensureOrganization();
    if (!orgId) {
        return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    try {
        const report = await generateKeywordOpportunityReport(normalizedIndustry, normalizedLocation);
        return {
            success: true,
            report,
        };
    } catch (error) {
        console.error('Failed to generate keyword ideas:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate keyword ideas.',
        };
    }
}
