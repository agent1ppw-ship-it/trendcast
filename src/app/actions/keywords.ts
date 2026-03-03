'use server';

import { ensureOrganization } from '@/app/actions/auth';
import { generateKeywordOpportunityReport } from '@/lib/ai/keywordOpportunities';
import { generateKeywordTargetedBlogArticle } from '@/lib/ai/articleGenerator';
import { prisma } from '@/lib/prisma';

function isCityStateLocation(value: string) {
    const normalized = value.trim();
    return /^[A-Za-z .'-]+,\s*[A-Za-z]{2,}(?:\s[A-Za-z]+)*$/.test(normalized);
}

export async function generateKeywordIdeas(industry: string, location: string) {
    const normalizedIndustry = industry.trim();
    const normalizedLocation = location.trim();

    if (!normalizedIndustry) {
        return { success: false, error: 'Choose an industry to search.' };
    }

    if (!normalizedLocation) {
        return { success: false, error: 'Enter a city and state to search.' };
    }

    if (!isCityStateLocation(normalizedLocation)) {
        return { success: false, error: 'Use a city and state format like "Chicago, IL" or "Fort Wayne, Indiana".' };
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

export async function generateKeywordBlogDraft(
    industry: string,
    location: string,
    selectedKeywords: string[],
    regenerationSeed?: string,
    previousDraft?: {
        title: string;
        excerpt: string;
        contentMarkdown: string;
    },
) {
    const normalizedIndustry = industry.trim();
    const normalizedLocation = location.trim();
    const sanitizedKeywords = selectedKeywords
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .slice(0, 5);

    if (!normalizedIndustry) {
        return { success: false, error: 'Choose an industry to search.' };
    }

    if (!normalizedLocation) {
        return { success: false, error: 'Enter a city and state to search.' };
    }

    if (!isCityStateLocation(normalizedLocation)) {
        return { success: false, error: 'Use a city and state format like "Chicago, IL" or "Fort Wayne, Indiana".' };
    }

    if (sanitizedKeywords.length === 0) {
        return { success: false, error: 'Select at least one keyword to generate a blog draft.' };
    }

    const orgId = await ensureOrganization();
    if (!orgId) {
        return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    try {
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { name: true },
        });

        const [primaryKeyword, ...supportingKeywords] = sanitizedKeywords;
        const draft = await generateKeywordTargetedBlogArticle(
            primaryKeyword,
            supportingKeywords,
            normalizedLocation,
            org?.name || 'TrendCast Client',
            normalizedIndustry,
            regenerationSeed,
            previousDraft,
        );

        return {
            success: true,
            draft,
        };
    } catch (error) {
        console.error('Failed to generate keyword blog draft:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate keyword blog draft.',
        };
    }
}
