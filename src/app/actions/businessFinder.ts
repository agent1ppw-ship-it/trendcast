'use server';

import * as cheerio from 'cheerio';
import type { Browser } from 'playwright';

export interface BusinessFinderLead {
    id: string;
    name: string;
    industry: string;
    zipCode: string;
    city: string;
    address: string;
    phone: string;
    website: string;
    listingUrl: string;
    sourceLabel: string;
}

type YellowPagesPostalAddress = {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
};

type YellowPagesBusiness = {
    '@type'?: string | string[];
    name?: string;
    url?: string;
    telephone?: string;
    address?: YellowPagesPostalAddress;
};

function mapIndustryToSearchTerm(industry: string) {
    const normalized = industry.trim().toLowerCase();

    switch (normalized) {
        case 'hvac':
            return 'air conditioning contractors systems';
        case 'landscaping':
            return 'landscaping lawn services';
        case 'plumbing':
            return 'plumbers';
        case 'pressure washing':
            return 'pressure washing';
        case 'electrical':
            return 'electricians';
        case 'concrete':
            return 'concrete contractors';
        case 'pest control':
            return 'pest control services';
        default:
            return normalized;
    }
}

function isLocalBusiness(node: unknown): node is YellowPagesBusiness {
    if (!node || typeof node !== 'object') return false;

    const candidate = node as YellowPagesBusiness;
    if (!candidate['@type']) return false;

    if (Array.isArray(candidate['@type'])) {
        return candidate['@type'].includes('LocalBusiness');
    }

    return candidate['@type'] === 'LocalBusiness';
}

function extractLocalBusinesses(value: unknown): YellowPagesBusiness[] {
    if (Array.isArray(value)) {
        return value.flatMap(extractLocalBusinesses);
    }

    if (!value || typeof value !== 'object') {
        return [];
    }

    if (isLocalBusiness(value)) {
        return [value];
    }

    return Object.values(value).flatMap(extractLocalBusinesses);
}

function formatAddress(address?: YellowPagesPostalAddress) {
    if (!address) return '';

    const parts = [
        address.streetAddress,
        [address.addressLocality, address.addressRegion, address.postalCode].filter(Boolean).join(' '),
    ].filter(Boolean);

    return parts.join(', ');
}

function toAbsoluteYellowPagesUrl(url?: string) {
    if (!url) return '';
    return url.startsWith('http') ? url : `https://www.yellowpages.com${url}`;
}

export async function searchBusinessesByZip(zipCode: string, industry: string, batchSize: number) {
    const normalizedZip = zipCode.trim();
    const normalizedIndustry = industry.trim();
    const safeBatchSize = Math.min(Math.max(batchSize, 1), 50);

    if (!/^\d{5}$/.test(normalizedZip)) {
        return { success: false, error: 'Enter a valid 5-digit ZIP code.' };
    }

    if (!normalizedIndustry) {
        return { success: false, error: 'Choose an industry to search.' };
    }

    const searchTerm = mapIndustryToSearchTerm(normalizedIndustry);
    const searchUrl = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(searchTerm)}&geo_location_terms=${encodeURIComponent(normalizedZip)}`;

    let browser: Browser | null = null;

    try {
        const { chromium } = await import('playwright-extra');
        const stealthModule = await import('puppeteer-extra-plugin-stealth');
        const stealthPlugin = stealthModule.default;

        chromium.use(stealthPlugin() as never);

        browser = await chromium.launch({
            headless: true,
            ...(process.env.PLAYWRIGHT_PROXY_SERVER ? {
                proxy: {
                    server: process.env.PLAYWRIGHT_PROXY_SERVER,
                    username: process.env.PLAYWRIGHT_PROXY_USERNAME,
                    password: process.env.PLAYWRIGHT_PROXY_PASSWORD,
                },
            } : {}),
        });

        const page = await browser.newPage({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            viewport: { width: 1440, height: 2400 },
        });

        await page.route('**/*', async (route) => {
            const resourceType = route.request().resourceType();
            if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
                await route.abort();
                return;
            }

            await route.continue();
        });

        await page.goto(searchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 45000,
        });

        await page.waitForTimeout(4000);

        const html = await page.content();
        const $ = cheerio.load(html);
        const scripts = $('script[type="application/ld+json"]')
            .map((_, element) => $(element).text())
            .get();

        const parsedBusinesses = scripts.flatMap((scriptContent) => {
            try {
                return extractLocalBusinesses(JSON.parse(scriptContent));
            } catch {
                return [];
            }
        });

        const uniqueBusinesses = new Map<string, BusinessFinderLead>();

        for (const business of parsedBusinesses) {
            const postalCode = business.address?.postalCode?.trim();
            if (postalCode !== normalizedZip) continue;
            if (!business.name || !business.telephone) continue;

            const address = formatAddress(business.address);
            const key = `${business.name}-${address}`.toLowerCase();
            if (uniqueBusinesses.has(key)) continue;

            uniqueBusinesses.set(key, {
                id: key,
                name: business.name,
                industry: normalizedIndustry,
                zipCode: normalizedZip,
                city: business.address?.addressLocality || '',
                address,
                phone: business.telephone,
                website: toAbsoluteYellowPagesUrl(business.url),
                listingUrl: toAbsoluteYellowPagesUrl(business.url),
                sourceLabel: 'Yellow Pages',
            });

            if (uniqueBusinesses.size >= safeBatchSize) break;
        }

        return {
            success: true,
            leads: Array.from(uniqueBusinesses.values()),
            sourceLabel: 'Yellow Pages',
            searchUrl,
        };
    } catch (error) {
        console.error('Business Finder search failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch business listings.',
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
