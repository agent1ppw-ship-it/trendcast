import * as cheerio from 'cheerio';

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

export function mapIndustryToSearchTerm(industry: string) {
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

export function extractBusinessesFromYellowPagesHtml(
    html: string,
    zipCode: string,
    industry: string,
    batchSize: number,
) {
    const safeBatchSize = Math.min(Math.max(batchSize, 1), 50);
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
        if (postalCode !== zipCode) continue;
        if (!business.name || !business.telephone) continue;

        const address = formatAddress(business.address);
        const key = `${business.name}-${address}`.toLowerCase();
        if (uniqueBusinesses.has(key)) continue;

        uniqueBusinesses.set(key, {
            id: key,
            name: business.name,
            industry,
            zipCode,
            city: business.address?.addressLocality || '',
            address,
            phone: business.telephone,
            website: toAbsoluteYellowPagesUrl(business.url),
            listingUrl: toAbsoluteYellowPagesUrl(business.url),
            sourceLabel: 'Yellow Pages',
        });

        if (uniqueBusinesses.size >= safeBatchSize) break;
    }

    return Array.from(uniqueBusinesses.values());
}
