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
    email?: string;
    contactPageUrl?: string;
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

export type ZipGeocodeResult = {
    lat: number;
    lon: number;
    city: string;
    state: string;
};

export interface OpenStreetMapSearchResult {
    leads: BusinessFinderLead[];
    matchStrategy: BusinessFinderMatchStrategy;
    sourceLabel: string;
    diagnostics?: {
        geocodeFound: boolean;
        overpassElementCount: number;
        nominatimResultCount: number;
    };
}

export const BUSINESS_FINDER_RADIUS_OPTIONS = [10, 25, 50, 100, 150, 250] as const;

function getSafeBatchSize(batchSize: number) {
    return Math.min(Math.max(batchSize, 1), 100);
}

export function getSafeSearchRadiusMiles(radiusMiles: number) {
    return Math.min(Math.max(Math.round(radiusMiles || 50), 10), 250);
}

export function getIndustrySearchVariants(industry: string) {
    const normalized = industry.trim().toLowerCase();
    const variants = new Set<string>();

    switch (normalized) {
        case 'hvac':
            variants.add('air conditioning contractors systems');
            variants.add('hvac');
            variants.add('heating and air conditioning');
            variants.add('air conditioning repair');
            break;
        case 'landscaping':
            variants.add('landscaping lawn services');
            variants.add('landscaping');
            variants.add('lawn care');
            variants.add('tree service');
            break;
        case 'plumbing':
            variants.add('plumbers');
            variants.add('plumbing');
            variants.add('plumbing contractors');
            variants.add('drain cleaning');
            break;
        case 'pressure washing':
            variants.add('pressure washing');
            variants.add('power washing');
            variants.add('soft washing');
            variants.add('exterior cleaning');
            break;
        case 'electrical':
            variants.add('electricians');
            variants.add('electrical contractors');
            variants.add('electrical services');
            break;
        case 'concrete':
            variants.add('concrete contractors');
            variants.add('concrete');
            variants.add('masonry');
            break;
        case 'pest control':
            variants.add('pest control services');
            variants.add('pest control');
            variants.add('exterminators');
            break;
        case 'roofing':
            variants.add('roofing contractors');
            variants.add('roofers');
            variants.add('roof repair');
            break;
        default:
            variants.add(normalized);
            break;
    }

    return Array.from(variants);
}

export function mergeBusinessLeads(collections: BusinessFinderLead[][], batchSize: number) {
    const merged = new Map<string, BusinessFinderLead>();

    for (const collection of collections) {
        for (const lead of collection) {
            if (!merged.has(lead.id)) {
                merged.set(lead.id, lead);
            }

            if (merged.size >= getSafeBatchSize(batchSize)) {
                return Array.from(merged.values());
            }
        }
    }

    return Array.from(merged.values());
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
    return getIndustrySearchVariants(industry)[0] || industry.trim().toLowerCase();
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

function normalizeUrl(url?: string, relativeBase?: string) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('www.')) return `https://${url}`;
    if (relativeBase && url.startsWith('/')) return `${relativeBase}${url}`;
    return url;
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
    sourceLabel = 'Yellow Pages',
    email,
    contactPageUrl,
}: {
    name: string;
    industry: string;
    zipCode: string;
    city?: string;
    address?: string;
    phone?: string;
    website?: string;
    listingUrl?: string;
    sourceLabel?: string;
    email?: string;
    contactPageUrl?: string;
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
        website: normalizeUrl(website, 'https://www.yellowpages.com'),
        listingUrl: normalizeUrl(listingUrl, 'https://www.yellowpages.com'),
        sourceLabel,
        email: normalizeText(email),
        contactPageUrl: normalizeUrl(contactPageUrl),
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
    const safeBatchSize = getSafeBatchSize(batchSize);
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

export type NominatimSearchResult = {
    place_id?: number;
    osm_type?: 'node' | 'way' | 'relation';
    osm_id?: number;
    lat?: string;
    lon?: string;
    name?: string;
    display_name?: string;
    extratags?: Record<string, string>;
    address?: Record<string, string>;
};

function normalizePlaceName(value?: string) {
    return normalizeText(value);
}

type OverpassElement = {
    id: number;
    type: 'node' | 'way' | 'relation';
    lat?: number;
    lon?: number;
    center?: {
        lat: number;
        lon: number;
    };
    tags?: Record<string, string>;
};

function getOpenStreetMapNamePattern(industry: string) {
    const normalized = industry.trim().toLowerCase();

    switch (normalized) {
        case 'landscaping':
            return 'landscap|lawn|gardening|tree service';
        case 'hvac':
            return 'hvac|heating|cooling|air conditioning';
        case 'plumbing':
            return 'plumb';
        case 'pressure washing':
            return 'pressure wash|power wash|soft wash';
        case 'electrical':
            return 'electric';
        case 'concrete':
            return 'concrete|masonry';
        case 'pest control':
            return 'pest|exterminat';
        case 'roofing':
            return 'roof';
        default:
            return normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

function getOpenStreetMapTagQueries(industry: string) {
    const normalized = industry.trim().toLowerCase();

    switch (normalized) {
        case 'landscaping':
            return ['["craft"="gardener"]', '["shop"="garden_centre"]'];
        case 'hvac':
            return ['["craft"="hvac"]'];
        case 'plumbing':
            return ['["craft"="plumber"]'];
        case 'electrical':
            return ['["craft"="electrician"]'];
        case 'roofing':
            return ['["craft"="roofer"]'];
        case 'pest control':
            return ['["craft"="pest_control"]'];
        default:
            return [];
    }
}

function escapeOverpassString(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const DEFAULT_SEARCH_RADIUS_MILES = 50;

export async function fetchZipGeocode(zipCode: string): Promise<ZipGeocodeResult | null> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', `${zipCode}, United States`);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'us');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
        headers: {
            'User-Agent': 'trendcast-business-finder/1.0',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        return null;
    }

    const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
        address?: Record<string, string>;
    }>;
    const first = results[0];
    if (!first) return null;

    return {
        lat: Number(first.lat),
        lon: Number(first.lon),
        city: normalizePlaceName(
            first.address?.city ||
            first.address?.town ||
            first.address?.village ||
            first.address?.hamlet
        ),
        state: normalizePlaceName(first.address?.state || first.address?.state_code),
    };
}

function toRadians(value: number) {
    return (value * Math.PI) / 180;
}

function distanceInMiles(
    a: { lat: number; lon: number },
    b: { lat: number; lon: number },
) {
    const earthRadiusMiles = 3958.8;
    const dLat = toRadians(b.lat - a.lat);
    const dLon = toRadians(b.lon - a.lon);
    const lat1 = toRadians(a.lat);
    const lat2 = toRadians(b.lat);

    const haversine =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    return earthRadiusMiles * arc;
}

function isWithinSearchArea(
    searchCenter: ZipGeocodeResult | null,
    candidateLat?: number,
    candidateLon?: number,
    radiusMiles = DEFAULT_SEARCH_RADIUS_MILES,
) {
    if (!searchCenter || candidateLat === undefined || candidateLon === undefined) {
        return false;
    }

    return distanceInMiles(searchCenter, { lat: candidateLat, lon: candidateLon }) <= getSafeSearchRadiusMiles(radiusMiles);
}

function buildOpenStreetMapAddress(tags: Record<string, string>) {
    const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
    const locality = [tags['addr:city'] || tags['addr:town'] || tags['addr:village'], tags['addr:state'], tags['addr:postcode']]
        .filter(Boolean)
        .join(' ');

    return [street, locality].filter(Boolean).join(', ');
}

function buildLocationQueries(industry: string, zipCode: string, geocode: ZipGeocodeResult | null) {
    const locationParts = [geocode?.city, geocode?.state].filter(Boolean).join(', ');

    const queries = getIndustrySearchVariants(industry).flatMap((searchTerm) => {
        const variantQueries = [
            `${searchTerm} near ${zipCode}`,
            `${searchTerm} ${zipCode}`,
        ];

        if (locationParts) {
            variantQueries.unshift(
                `${searchTerm} near ${locationParts}`,
                `${searchTerm} ${locationParts}`,
            );
        }

        return variantQueries;
    });

    return Array.from(new Set(queries.map((query) => normalizeText(query)).filter(Boolean)));
}

export async function searchOpenStreetMapBusinessesByZip(
    zipCode: string,
    industry: string,
    batchSize: number,
    radiusMiles = DEFAULT_SEARCH_RADIUS_MILES,
): Promise<OpenStreetMapSearchResult> {
    const safeBatchSize = getSafeBatchSize(batchSize);
    const safeRadiusMiles = getSafeSearchRadiusMiles(radiusMiles);
    const geocode = await fetchZipGeocode(zipCode);
    if (!geocode) {
        return {
            leads: [],
            matchStrategy: 'area_results',
            sourceLabel: 'OpenStreetMap',
            diagnostics: {
                geocodeFound: false,
                overpassElementCount: 0,
                nominatimResultCount: 0,
            },
        };
    }

    const tagQueries = getOpenStreetMapTagQueries(industry);
    const aroundRadius = Math.min(Math.max(Math.round(safeRadiusMiles * 1609.34), 10000), 402336);
    const clauses = getIndustrySearchVariants(industry)
        .flatMap((searchVariant) => {
            const namePattern = escapeOverpassString(getOpenStreetMapNamePattern(searchVariant));
            return [
                `node["name"~"${namePattern}",i](around:${aroundRadius},${geocode.lat},${geocode.lon});`,
                `way["name"~"${namePattern}",i](around:${aroundRadius},${geocode.lat},${geocode.lon});`,
                `relation["name"~"${namePattern}",i](around:${aroundRadius},${geocode.lat},${geocode.lon});`,
            ];
        })
        .concat(
            tagQueries.flatMap((query) => ([
                `node${query}(around:${aroundRadius},${geocode.lat},${geocode.lon});`,
                `way${query}(around:${aroundRadius},${geocode.lat},${geocode.lon});`,
                `relation${query}(around:${aroundRadius},${geocode.lat},${geocode.lon});`,
            ]))
        );

    const overpassQuery = `
[out:json][timeout:25];
(
${clauses.join('\n')}
);
out center tags;
`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            'User-Agent': 'trendcast-business-finder/1.0',
        },
        body: overpassQuery,
        signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
        return {
            leads: [],
            matchStrategy: 'area_results',
            sourceLabel: 'OpenStreetMap',
            diagnostics: {
                geocodeFound: true,
                overpassElementCount: 0,
                nominatimResultCount: 0,
            },
        };
    }

    const data = (await response.json()) as { elements?: OverpassElement[] };
    const elements = data.elements || [];
    const exactMatches = new Map<string, BusinessFinderLead>();
    const areaMatches = new Map<string, BusinessFinderLead>();

    for (const element of elements) {
        const tags = element.tags || {};
        const name = normalizeText(tags.name);
        if (!name) continue;

        const address = buildOpenStreetMapAddress(tags);
        const phone = tags.phone || tags['contact:phone'] || '';
        const email = tags.email || tags['contact:email'] || '';
        const website = tags.website || tags['contact:website'] || tags.url || '';
        const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '';
        const listingUrl = `https://www.openstreetmap.org/${element.type}/${element.id}`;

        const lead = buildLead({
            name,
            industry,
            zipCode,
            city,
            address: address || `${city} ${zipCode}`.trim(),
            phone,
            email,
            website,
            listingUrl,
            sourceLabel: 'OpenStreetMap',
        });

        if (!lead.address) continue;

        const postcode = normalizeZip(tags['addr:postcode'] || lead.address);
        if (postcode === zipCode) {
            addLeadIfUnique(exactMatches, lead);
        } else {
            addLeadIfUnique(areaMatches, lead);
        }
    }

    const exactLeads = Array.from(exactMatches.values()).slice(0, safeBatchSize);
    if (exactLeads.length > 0) {
        return {
            leads: exactLeads,
            matchStrategy: 'exact_zip',
            sourceLabel: 'OpenStreetMap',
            diagnostics: {
                geocodeFound: true,
                overpassElementCount: elements.length,
                nominatimResultCount: 0,
            },
        };
    }

    const areaLeads = Array.from(areaMatches.values()).slice(0, safeBatchSize);
    if (areaLeads.length > 0) {
        return {
            leads: areaLeads,
            matchStrategy: 'area_results',
            sourceLabel: 'OpenStreetMap',
            diagnostics: {
                geocodeFound: true,
                overpassElementCount: elements.length,
                nominatimResultCount: 0,
            },
        };
    }

    const searchQueries = buildLocationQueries(industry, zipCode, geocode);
    let nominatimResultCount = 0;

    for (const query of searchQueries) {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('q', query);
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('limit', String(Math.min(safeBatchSize * 4, 100)));
        url.searchParams.set('countrycodes', 'us');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('extratags', '1');

        const nominatimResponse = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'trendcast-business-finder/1.0',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!nominatimResponse.ok) {
            continue;
        }

        const nominatimResults = (await nominatimResponse.json()) as NominatimSearchResult[];
        nominatimResultCount += nominatimResults.length;

        for (const result of nominatimResults) {
            const address = normalizeText(result.display_name);
            const name = normalizeText(result.name || address.split(',')[0]);
            const tags = result.extratags || {};
            const phone = tags.phone || tags['contact:phone'] || '';
            const email = tags.email || tags['contact:email'] || '';
            const website = tags.website || tags['contact:website'] || tags.url || '';
            const city = normalizeText(
                result.address?.city ||
                result.address?.town ||
                result.address?.village ||
                result.address?.hamlet
            );
            const postcode = normalizeZip(result.address?.postcode || address);
            const resultLat = result.lat ? Number(result.lat) : undefined;
            const resultLon = result.lon ? Number(result.lon) : undefined;
            const listingUrl = result.osm_type && result.osm_id
                ? `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`
                : '';

            if (!name || !address) continue;

            const lead = buildLead({
                name,
                industry,
                zipCode,
                city,
                address,
                phone,
                email,
                website,
                listingUrl,
                sourceLabel: 'OpenStreetMap Search',
            });

            if (postcode === zipCode) {
                addLeadIfUnique(exactMatches, lead);
            } else if (isWithinSearchArea(geocode, resultLat, resultLon, safeRadiusMiles)) {
                addLeadIfUnique(areaMatches, lead);
            }

            if (exactMatches.size >= safeBatchSize || areaMatches.size >= safeBatchSize) {
                break;
            }
        }

        if (exactMatches.size >= safeBatchSize || areaMatches.size >= safeBatchSize) {
            break;
        }
    }

    const fallbackExactLeads = Array.from(exactMatches.values()).slice(0, safeBatchSize);
    if (fallbackExactLeads.length > 0) {
        return {
            leads: fallbackExactLeads,
            matchStrategy: 'exact_zip',
            sourceLabel: 'OpenStreetMap Search',
            diagnostics: {
                geocodeFound: true,
                overpassElementCount: elements.length,
                nominatimResultCount,
            },
        };
    }

    return {
        leads: Array.from(areaMatches.values()).slice(0, safeBatchSize),
        matchStrategy: 'area_results',
        sourceLabel: 'OpenStreetMap Search',
        diagnostics: {
            geocodeFound: true,
            overpassElementCount: elements.length,
            nominatimResultCount,
        },
    };
}

export function mapNominatimResultsToBusinessLeads(
    results: NominatimSearchResult[],
    zipCode: string,
    industry: string,
    batchSize: number,
    sourceLabel = 'OpenStreetMap Search',
    searchCenter: ZipGeocodeResult | null = null,
    radiusMiles = DEFAULT_SEARCH_RADIUS_MILES,
): OpenStreetMapSearchResult {
    const safeBatchSize = getSafeBatchSize(batchSize);
    const safeRadiusMiles = getSafeSearchRadiusMiles(radiusMiles);
    const exactMatches = new Map<string, BusinessFinderLead>();
    const areaMatches = new Map<string, BusinessFinderLead>();

    for (const result of results) {
        const address = normalizeText(result.display_name);
        const name = normalizeText(result.name || address.split(',')[0]);
        const tags = result.extratags || {};
        const phone = tags.phone || tags['contact:phone'] || '';
        const email = tags.email || tags['contact:email'] || '';
        const website = tags.website || tags['contact:website'] || tags.url || '';
        const city = normalizeText(
            result.address?.city ||
            result.address?.town ||
            result.address?.village ||
            result.address?.hamlet
        );
        const postcode = normalizeZip(result.address?.postcode || address);
        const resultLat = result.lat ? Number(result.lat) : undefined;
        const resultLon = result.lon ? Number(result.lon) : undefined;
        const listingUrl = result.osm_type && result.osm_id
            ? `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`
            : '';

        if (!name || !address) continue;

        const lead = buildLead({
            name,
            industry,
            zipCode,
            city,
            address,
            phone,
            email,
            website,
            listingUrl,
            sourceLabel,
        });

        if (postcode === zipCode) {
            addLeadIfUnique(exactMatches, lead);
        } else if (isWithinSearchArea(searchCenter, resultLat, resultLon, safeRadiusMiles)) {
            addLeadIfUnique(areaMatches, lead);
        }

        if (exactMatches.size >= safeBatchSize || areaMatches.size >= safeBatchSize) {
            break;
        }
    }

    const exactLeads = Array.from(exactMatches.values()).slice(0, safeBatchSize);
    if (exactLeads.length > 0) {
        return {
            leads: exactLeads,
            matchStrategy: 'exact_zip',
            sourceLabel,
        };
    }

    return {
        leads: Array.from(areaMatches.values()).slice(0, safeBatchSize),
        matchStrategy: 'area_results',
        sourceLabel,
    };
}

export function buildBrowserLocationQueries(industry: string, zipCode: string, geocode: ZipGeocodeResult | null) {
    return buildLocationQueries(industry, zipCode, geocode);
}

export interface BusinessLeadContactEnrichment {
    email: string;
    phone: string;
    website: string;
    contactPageUrl: string;
    scannedUrls: string[];
}

function normalizeWebUrl(raw?: string) {
    const normalized = normalizeUrl(raw);
    if (!normalized) return '';

    try {
        const parsed = new URL(normalized);
        if (!['http:', 'https:'].includes(parsed.protocol)) return '';
        return parsed.toString();
    } catch {
        return '';
    }
}

function extractEmailsFromText(content: string) {
    const matches = content.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
    const blacklist = new Set([
        'example.com',
        'domain.com',
    ]);

    const unique = new Set<string>();
    for (const match of matches) {
        const email = match.toLowerCase().trim();
        const domain = email.split('@')[1] || '';
        if (blacklist.has(domain)) continue;
        unique.add(email);
    }

    return Array.from(unique);
}

function normalizePhoneForDisplay(value: string) {
    return normalizeText(value.replace(/\s+/g, ' '));
}

function extractPhoneFromText(content: string) {
    const match = content.match(/\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return match ? normalizePhoneForDisplay(match[0]) : '';
}

function toAbsoluteHttpUrl(href: string, baseUrl: string) {
    try {
        const absolute = new URL(href, baseUrl);
        if (!['http:', 'https:'].includes(absolute.protocol)) return '';
        return absolute.toString();
    } catch {
        return '';
    }
}

async function fetchHtml(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'trendcast-business-finder/1.0',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return '';

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) return '';
        return await response.text();
    } catch {
        return '';
    }
}

export async function enrichBusinessLeadContact(lead: Pick<BusinessFinderLead, 'website' | 'listingUrl' | 'phone' | 'email'>): Promise<BusinessLeadContactEnrichment> {
    const baseWebsite = normalizeWebUrl(lead.website) || normalizeWebUrl(lead.listingUrl);
    const scannedUrls: string[] = [];

    if (!baseWebsite) {
        return {
            email: normalizeText(lead.email),
            phone: normalizeText(lead.phone),
            website: '',
            contactPageUrl: '',
            scannedUrls,
        };
    }

    const seedUrls = [baseWebsite];
    let bestEmail = normalizeText(lead.email);
    let bestPhone = normalizeText(lead.phone);
    let contactPageUrl = '';

    const seen = new Set<string>();
    const queue = [...seedUrls];
    const contactCandidates: string[] = [];

    while (queue.length > 0 && scannedUrls.length < 3) {
        const currentUrl = queue.shift()!;
        if (seen.has(currentUrl)) continue;
        seen.add(currentUrl);

        const html = await fetchHtml(currentUrl);
        if (!html) continue;
        scannedUrls.push(currentUrl);

        const $ = cheerio.load(html);
        const pageText = $('body').text();
        const htmlEmails = extractEmailsFromText(`${pageText}\n${html}`);
        if (!bestEmail && htmlEmails.length > 0) {
            bestEmail = htmlEmails[0];
        }

        if (!bestPhone) {
            const textPhone = extractPhoneFromText(pageText);
            if (textPhone) bestPhone = textPhone;
        }

        $('a[href]').each((_, element) => {
            const href = normalizeText($(element).attr('href'));
            const anchorText = normalizeText($(element).text()).toLowerCase();
            if (!href) return;

            if (href.startsWith('mailto:')) {
                const mail = normalizeText(href.replace(/^mailto:/i, '').split('?')[0]).toLowerCase();
                if (!bestEmail && mail.includes('@')) bestEmail = mail;
                return;
            }

            const absoluteUrl = toAbsoluteHttpUrl(href, currentUrl);
            if (!absoluteUrl) return;

            try {
                const targetHost = new URL(absoluteUrl).hostname.replace(/^www\./, '');
                const baseHost = new URL(baseWebsite).hostname.replace(/^www\./, '');
                if (targetHost !== baseHost) return;
            } catch {
                return;
            }

            if (
                /contact|about|team|get in touch|support/i.test(href) ||
                /contact|about|team|get in touch|support/i.test(anchorText)
            ) {
                contactCandidates.push(absoluteUrl);
            }
        });

        if (!bestEmail) {
            for (const candidate of contactCandidates) {
                if (!seen.has(candidate) && queue.length < 2) {
                    queue.push(candidate);
                }
            }
        }

        if (bestEmail && contactCandidates.length > 0) {
            contactPageUrl = contactCandidates[0];
        }
    }

    return {
        email: bestEmail,
        phone: bestPhone,
        website: baseWebsite,
        contactPageUrl,
        scannedUrls,
    };
}
