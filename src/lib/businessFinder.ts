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

export type BusinessFinderMatchStrategy = 'exact_zip' | 'area_results';

export interface BusinessFinderExtractionDiagnostics {
    jsonLdScriptCount: number;
    jsonLdBusinessCount: number;
    resultCardCount: number;
    textLineCount: number;
    exactZipLeadCount: number;
    areaLeadCount: number;
    textExactLeadCount: number;
    textAreaLeadCount: number;
}

export interface BusinessFinderExtractionResult {
    leads: BusinessFinderLead[];
    matchStrategy: BusinessFinderMatchStrategy;
    diagnostics: BusinessFinderExtractionDiagnostics;
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

function normalizeZip(value?: string) {
    if (!value) return '';

    const match = value.match(/\b\d{5}(?:-\d{4})?\b/);
    return match ? match[0].slice(0, 5) : '';
}

function normalizeText(value?: string | null) {
    return value?.replace(/\s+/g, ' ').trim() || '';
}

function buildLead({
    name,
    industry,
    zipCode,
    city,
    address,
    phone,
    website,
    listingUrl,
}: {
    name: string;
    industry: string;
    zipCode: string;
    city?: string;
    address?: string;
    phone?: string;
    website?: string;
    listingUrl?: string;
}): BusinessFinderLead {
    const normalizedAddress = normalizeText(address);
    const normalizedName = normalizeText(name);

    return {
        id: `${normalizedName}-${normalizedAddress}`.toLowerCase(),
        name: normalizedName,
        industry,
        zipCode,
        city: normalizeText(city),
        address: normalizedAddress,
        phone: normalizeText(phone),
        website: toAbsoluteYellowPagesUrl(website),
        listingUrl: toAbsoluteYellowPagesUrl(listingUrl),
        sourceLabel: 'Yellow Pages',
    };
}

function extractCityFromLocality(localityText: string) {
    const normalized = normalizeText(localityText);
    if (!normalized) return '';

    const city = normalized.split(',')[0];
    return normalizeText(city);
}

function addLeadIfUnique(target: Map<string, BusinessFinderLead>, lead: BusinessFinderLead) {
    if (!lead.name || !lead.address) return;
    if (!lead.phone && !lead.website && !lead.listingUrl) return;
    if (!target.has(lead.id)) {
        target.set(lead.id, lead);
    }
}

function isPhoneLine(line: string) {
    return /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/.test(line) || /^\(\d{3}\)\s*\d{3}-\d{4}$/.test(line);
}

function normalizePhone(line: string) {
    const match = line.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
    return match ? match[0].replace(/\s+/g, ' ') : '';
}

function isCityStateZipLine(line: string) {
    return /^[A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?$/i.test(line);
}

function isMetaLine(line: string) {
    return (
        !line ||
        /^(Website|Directions|More Info|opening soon|open now|closed now|open 24 hours)$/i.test(line) ||
        /^From Business:/i.test(line) ||
        /^in Business$/i.test(line) ||
        /^Accredited$/i.test(line) ||
        /^Business$/i.test(line) ||
        /^\d+\s+Years$/i.test(line) ||
        /^\d+\s+Years with$/i.test(line) ||
        /^Yellow Pages$/i.test(line) ||
        /^Serving the$/i.test(line) ||
        /^About Search Results$/i.test(line) ||
        /^Sort:Default$/i.test(line) ||
        /^View all businesses/i.test(line)
    );
}

function isLikelyStreetAddress(line: string) {
    return /\d/.test(line) && !isPhoneLine(line) && !isCityStateZipLine(line) && !/^From Business:/i.test(line);
}

function extractBusinessesFromYellowPagesText(
    text: string,
    zipCode: string,
    industry: string,
    batchSize: number,
) {
    const safeBatchSize = Math.min(Math.max(batchSize, 1), 50);
    const lines = text
        .split('\n')
        .map((line) => normalizeText(line))
        .filter(Boolean);

    const firstResultIndex = lines.findIndex((line) => /^\d+\.\s+/.test(line));
    if (firstResultIndex === -1) {
        return {
            exactLeads: [] as BusinessFinderLead[],
            areaLeads: [] as BusinessFinderLead[],
            lineCount: lines.length,
        };
    }

    const exactMatches = new Map<string, BusinessFinderLead>();
    const areaMatches = new Map<string, BusinessFinderLead>();

    let index = firstResultIndex;

    while (index < lines.length) {
        const line = lines[index];
        if (/^About Search Results$/i.test(line) || /^Showing \d+-\d+ of/i.test(line)) {
            break;
        }

        if (!/^\d+\.\s+/.test(line)) {
            index += 1;
            continue;
        }

        const name = normalizeText(line.replace(/^\d+\.\s+/, ''));
        index += 1;

        const block: string[] = [];
        while (index < lines.length && !/^\d+\.\s+/.test(lines[index])) {
            if (/^About Search Results$/i.test(lines[index]) || /^Showing \d+-\d+ of/i.test(lines[index])) {
                break;
            }

            block.push(lines[index]);
            index += 1;
        }

        const phoneLine = block.find(isPhoneLine) || '';
        const phone = normalizePhone(phoneLine);
        const cityLineIndex = block.findIndex(isCityStateZipLine);

        let address = '';
        let city = '';

        if (cityLineIndex >= 0) {
            city = extractCityFromLocality(block[cityLineIndex]);
            const streetCandidate = block[cityLineIndex - 1] || '';
            address = isLikelyStreetAddress(streetCandidate)
                ? `${streetCandidate}, ${block[cityLineIndex]}`
                : block[cityLineIndex];
        } else {
            const streetOnly = block.find(isLikelyStreetAddress) || '';
            address = streetOnly;
        }

        const meaningfulBlockLine = block.find((entry) => !isMetaLine(entry) && !isPhoneLine(entry) && !isLikelyStreetAddress(entry) && !isCityStateZipLine(entry));
        const website = meaningfulBlockLine && /^www\.|https?:\/\//i.test(meaningfulBlockLine) ? meaningfulBlockLine : '';

        if (!name || !address) {
            continue;
        }

        const lead = buildLead({
            name,
            industry,
            zipCode,
            city,
            address,
            phone,
            website,
        });

        const detectedZip = normalizeZip(address);
        if (detectedZip === zipCode) {
            addLeadIfUnique(exactMatches, lead);
        } else {
            addLeadIfUnique(areaMatches, lead);
        }

        if (exactMatches.size >= safeBatchSize) {
            break;
        }
    }

    return {
        exactLeads: Array.from(exactMatches.values()).slice(0, safeBatchSize),
        areaLeads: Array.from(areaMatches.values()).slice(0, safeBatchSize),
        lineCount: lines.length,
    };
}

export function extractBusinessesFromYellowPagesHtml(
    html: string,
    zipCode: string,
    industry: string,
    batchSize: number,
): BusinessFinderExtractionResult {
    const safeBatchSize = Math.min(Math.max(batchSize, 1), 50);
    const $ = cheerio.load(html);
    const exactZipMatches = new Map<string, BusinessFinderLead>();
    const areaResults = new Map<string, BusinessFinderLead>();

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

    const resultCards = $('.search-results .result, .search-results .v-card, .organic .result, .result');

    for (const business of parsedBusinesses) {
        if (!business.name) continue;
        const address = formatAddress(business.address);
        const postalCode = normalizeZip(business.address?.postalCode || address);
        const lead = buildLead({
            name: business.name,
            industry,
            zipCode,
            city: business.address?.addressLocality || '',
            address,
            phone: business.telephone || '',
            website: business.url,
            listingUrl: business.url,
        });

        if (postalCode === zipCode) {
            addLeadIfUnique(exactZipMatches, lead);
        } else {
            addLeadIfUnique(areaResults, lead);
        }
    }

    resultCards.each((_, element) => {
        const card = $(element);
        const name = normalizeText(card.find('.business-name').first().text());
        const streetAddress = normalizeText(card.find('.street-address').first().text());
        const locality = normalizeText(card.find('.locality').first().text());
        const combinedAddress = normalizeText([streetAddress, locality].filter(Boolean).join(', '));
        const phone = normalizeText(
            card.find('.phones.phone.primary').first().text() ||
            card.find('.phones').first().text() ||
            card.find('.phone').first().text()
        );
        const listingUrl = card.find('.business-name').first().attr('href') || '';
        const website =
            card.find('.track-visit-website').first().attr('href') ||
            card.find('a[href*="website"]').first().attr('href') ||
            listingUrl;

        if (!name || !combinedAddress) return;

        const lead = buildLead({
            name,
            industry,
            zipCode,
            city: extractCityFromLocality(locality),
            address: combinedAddress,
            phone,
            website,
            listingUrl,
        });

        const cardZip = normalizeZip(combinedAddress);
        if (cardZip === zipCode) {
            addLeadIfUnique(exactZipMatches, lead);
            return;
        }

        if (!cardZip) {
            addLeadIfUnique(areaResults, lead);
        }
    });

    const exactLeads = Array.from(exactZipMatches.values()).slice(0, safeBatchSize);
    const textFallback = extractBusinessesFromYellowPagesText($('body').text(), zipCode, industry, safeBatchSize);
    const diagnostics: BusinessFinderExtractionDiagnostics = {
        jsonLdScriptCount: scripts.length,
        jsonLdBusinessCount: parsedBusinesses.length,
        resultCardCount: resultCards.length,
        textLineCount: textFallback.lineCount,
        exactZipLeadCount: exactLeads.length,
        areaLeadCount: Array.from(areaResults.values()).slice(0, safeBatchSize).length,
        textExactLeadCount: textFallback.exactLeads.length,
        textAreaLeadCount: textFallback.areaLeads.length,
    };

    if (exactLeads.length > 0) {
        return {
            leads: exactLeads,
            matchStrategy: 'exact_zip' as BusinessFinderMatchStrategy,
            diagnostics,
        };
    }

    if (textFallback.exactLeads.length > 0) {
        return {
            leads: textFallback.exactLeads,
            matchStrategy: 'exact_zip' as BusinessFinderMatchStrategy,
            diagnostics,
        };
    }

    const areaLeads = Array.from(areaResults.values()).slice(0, safeBatchSize);
    if (areaLeads.length > 0) {
        return {
            leads: areaLeads,
            matchStrategy: 'area_results' as BusinessFinderMatchStrategy,
            diagnostics,
        };
    }

    return {
        leads: textFallback.areaLeads,
        matchStrategy: 'area_results' as BusinessFinderMatchStrategy,
        diagnostics,
    };
}
