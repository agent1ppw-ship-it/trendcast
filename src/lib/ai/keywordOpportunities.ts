import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-key-for-build',
});

const KEYWORD_PROVIDER_TIMEOUT_MS = 15000;

export type KeywordBuyerIntent = 'HIGH' | 'MEDIUM';
export type KeywordCompetitionOutlook = 'LOW' | 'MEDIUM' | 'HIGH';
export type KeywordAssetType = 'Location Page' | 'Service Page' | 'Blog Article' | 'FAQ Cluster';

export interface KeywordOpportunity {
    keyword: string;
    buyerIntent: KeywordBuyerIntent;
    competitionOutlook: KeywordCompetitionOutlook;
    opportunityScore: number;
    suggestedAsset: KeywordAssetType;
    rationale: string;
    monthlySearchVolume: number | null;
    competitionScore: number | null;
    costPerClickUsd: number | null;
    trendPercent: number | null;
}

export interface KeywordOpportunityReport {
    summary: string;
    location: string;
    industry: string;
    keywords: KeywordOpportunity[];
    dataSource: 'GOOGLE_ADS_KEYWORD_PLANNER' | 'DATAFORSEO_GOOGLE_ADS' | 'AI_ESTIMATE' | 'TEMPLATE_FALLBACK';
    disclaimer: string;
}

type KeywordModelResponse = {
    summary: string;
    keywords: KeywordOpportunity[];
};

type DataForSeoResponse = {
    tasks?: Array<{
        status_code?: number;
        status_message?: string;
        result?: Array<{
            items?: Array<{
                keyword?: string;
                search_volume?: number;
                competition?: number;
                competition_index?: number;
                cpc?: number;
                low_top_of_page_bid?: number;
                high_top_of_page_bid?: number;
            }>;
        }>;
    }>;
};

type GoogleAdsAccessTokenResponse = {
    access_token?: string;
    expires_in?: number;
    token_type?: string;
};

type GoogleAdsGeoSuggestionResponse = {
    geoTargetConstantSuggestions?: Array<{
        geoTargetConstant?: {
            resourceName?: string;
            status?: string;
            name?: string;
            countryCode?: string;
            targetType?: string;
            canonicalName?: string;
        };
        reach?: string;
        searchTerm?: string;
    }>;
};

type GoogleAdsKeywordIdeaResponse = {
    results?: Array<{
        text?: string;
        keywordIdeaMetrics?: {
            avgMonthlySearches?: string | number;
            competition?: string;
            competitionIndex?: string | number;
            lowTopOfPageBidMicros?: string | number;
            highTopOfPageBidMicros?: string | number;
            monthlySearchVolumes?: Array<{
                year?: string | number;
                month?: string;
                monthlySearches?: string | number;
            }>;
        };
    }>;
    nextPageToken?: string;
    totalSize?: string | number;
};

const industryKeywordMap: Record<string, string[]> = {
    hvac: [
        'commercial hvac contractor',
        'hvac contractor for refrigeration',
        'emergency ac repair',
        'furnace installation',
        'ductless mini split installer',
        'rooftop unit repair',
        'commercial hvac maintenance',
        'chiller service',
        'restaurant refrigeration repair',
        'heat pump replacement',
    ],
    landscaping: [
        'landscaping contractor for turf installation',
        'landscaping contractor for patio design',
        'retaining wall contractor',
        'irrigation repair service',
        'commercial landscaping maintenance',
        'drainage grading contractor',
        'sod installation service',
        'outdoor lighting installer',
        'landscape design build contractor',
        'mulch and bed maintenance service',
    ],
    roofing: [
        'commercial roofing contractor',
        'roof leak repair service',
        'storm damage roof inspection',
        'flat roof replacement',
        'tpo roofing contractor',
        'metal roof coating service',
        'roof insurance claim inspection',
        'shingle roof replacement',
        'emergency roof tarp service',
        'roof ventilation installer',
    ],
    'pressure washing': [
        'commercial pressure washing service',
        'house soft washing service',
        'driveway pressure washing',
        'roof soft wash contractor',
        'deck cleaning service',
        'concrete cleaning and sealing',
        'storefront pressure washing',
        'parking garage pressure washing',
        'gutter brightening service',
        'restaurant exterior cleaning',
    ],
    plumbing: [
        'commercial plumbing contractor',
        'emergency plumber',
        'drain cleaning service',
        'water heater replacement',
        'sewer line repair',
        'tankless water heater installer',
        'leak detection service',
        'plumbing contractor for tenant buildout',
        'backflow testing service',
        'gas line plumber',
    ],
    electrical: [
        'commercial electrician',
        'electrical panel upgrade',
        'ev charger installer',
        'emergency electrician',
        'lighting retrofit contractor',
        'generator installation service',
        'surge protection installer',
        'tenant improvement electrician',
        'outdoor lighting electrician',
        'wiring repair service',
    ],
    concrete: [
        'commercial concrete contractor',
        'driveway concrete replacement',
        'foundation repair contractor',
        'decorative concrete installer',
        'warehouse concrete polishing',
        'concrete patio contractor',
        'parking lot concrete repair',
        'sidewalk replacement contractor',
        'retaining wall concrete contractor',
        'concrete sealing service',
    ],
    'pest control': [
        'commercial pest control service',
        'termite inspection service',
        'rodent control contractor',
        'bed bug treatment service',
        'ant control service',
        'restaurant pest control',
        'mosquito treatment service',
        'roach exterminator service',
        'warehouse pest management',
        'preventive pest control plan',
    ],
};

const stateNameMap: Record<string, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
    DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
    MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
    NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
    TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
    WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

function normalizeIndustry(industry: string) {
    return industry.trim().toLowerCase();
}

function toTitleCase(value: string) {
    return value
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(' ');
}

function sanitizeKeyword(keyword: string) {
    return keyword.replace(/\s+/g, ' ').trim();
}

function inferBuyerIntent(keyword: string): KeywordBuyerIntent {
    return /(contractor|service|repair|replacement|installer|inspection|maintenance|emergency|company|exterminator)/i.test(keyword)
        ? 'HIGH'
        : 'MEDIUM';
}

function inferCompetition(keyword: string): KeywordCompetitionOutlook {
    const tokenCount = keyword.split(/\s+/).length;
    if (tokenCount >= 6 && /(commercial|emergency|refrigeration|mini split|tpo|retaining wall|tenant buildout)/i.test(keyword)) {
        return 'LOW';
    }

    if (tokenCount >= 5) {
        return 'MEDIUM';
    }

    return 'HIGH';
}

function inferAsset(keyword: string): KeywordAssetType {
    if (/(how to|cost|best|vs|signs|when to)/i.test(keyword)) {
        return 'Blog Article';
    }

    if (/(near me|in )/i.test(keyword) && /(contractor|service|repair|replacement|installer|inspection)/i.test(keyword)) {
        return 'Location Page';
    }

    if (/(commercial|emergency|refrigeration|maintenance|installation|replacement|repair)/i.test(keyword)) {
        return 'Service Page';
    }

    return 'FAQ Cluster';
}

function normalizeCompetitionScore(rawCompetition: number | null | undefined, rawCompetitionIndex: number | null | undefined) {
    if (typeof rawCompetitionIndex === 'number' && Number.isFinite(rawCompetitionIndex)) {
        return Math.min(Math.max(Math.round(rawCompetitionIndex), 0), 100);
    }

    if (typeof rawCompetition === 'number' && Number.isFinite(rawCompetition)) {
        return Math.min(Math.max(Math.round(rawCompetition * 100), 0), 100);
    }

    return null;
}

function parseMetricNumber(value: string | number | null | undefined) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function deriveCompetitionOutlook(competitionScore: number | null, keyword: string) {
    if (competitionScore === null) {
        return inferCompetition(keyword);
    }

    if (competitionScore <= 33) return 'LOW';
    if (competitionScore <= 66) return 'MEDIUM';
    return 'HIGH';
}

function computeOpportunityScore(keyword: string, competitionOutlook: KeywordCompetitionOutlook, buyerIntent: KeywordBuyerIntent) {
    let score = 55;

    if (buyerIntent === 'HIGH') score += 18;
    if (competitionOutlook === 'LOW') score += 17;
    if (competitionOutlook === 'MEDIUM') score += 8;
    if (keyword.split(/\s+/).length >= 5) score += 6;
    if (/(commercial|emergency|refrigeration|storm damage|drainage|tenant buildout|soft wash)/i.test(keyword)) score += 8;

    return Math.min(score, 98);
}

function computeRealOpportunityScore(params: {
    keyword: string;
    buyerIntent: KeywordBuyerIntent;
    competitionScore: number | null;
    monthlySearchVolume: number | null;
    costPerClickUsd: number | null;
}) {
    const { keyword, buyerIntent, competitionScore, monthlySearchVolume, costPerClickUsd } = params;
    const competitionOutlook = deriveCompetitionOutlook(competitionScore, keyword);
    let score = computeOpportunityScore(keyword, competitionOutlook, buyerIntent);

    if (typeof monthlySearchVolume === 'number') {
        if (monthlySearchVolume >= 1000) score += 12;
        else if (monthlySearchVolume >= 300) score += 8;
        else if (monthlySearchVolume >= 50) score += 4;
        else score -= 4;
    }

    if (typeof competitionScore === 'number') {
        if (competitionScore <= 25) score += 10;
        else if (competitionScore <= 45) score += 4;
        else if (competitionScore >= 75) score -= 8;
    }

    if (typeof costPerClickUsd === 'number') {
        if (costPerClickUsd >= 12) score += 10;
        else if (costPerClickUsd >= 6) score += 6;
        else if (costPerClickUsd >= 2) score += 2;
    }

    if (/\b\d{5}\b/.test(keyword)) {
        score -= 3;
    }

    return Math.min(Math.max(Math.round(score), 1), 100);
}

function buildRationale(keyword: string, competition: KeywordCompetitionOutlook, intent: KeywordBuyerIntent) {
    const specificity = keyword.split(/\s+/).length >= 6 ? 'highly specific' : 'locally specific';
    return `${specificity} phrase with ${intent.toLowerCase()} buyer intent and ${competition.toLowerCase()} competition outlook for service-area SEO.`;
}

function buildRealMetricRationale(params: {
    keyword: string;
    monthlySearchVolume: number | null;
    costPerClickUsd: number | null;
    competitionScore: number | null;
    competitionOutlook: KeywordCompetitionOutlook;
    buyerIntent: KeywordBuyerIntent;
    trendPercent?: number | null;
}) {
    const searchVolume = params.monthlySearchVolume !== null ? `${params.monthlySearchVolume.toLocaleString()} avg monthly searches` : 'unknown monthly search volume';
    const cpc = params.costPerClickUsd !== null ? `$${params.costPerClickUsd.toFixed(2)} CPC` : 'no CPC available';
    const competition = params.competitionScore !== null
        ? `${params.competitionScore}/100 paid competition (${params.competitionOutlook.toLowerCase()})`
        : `${params.competitionOutlook.toLowerCase()} directional competition`;
    const trend = typeof params.trendPercent === 'number'
        ? `${params.trendPercent > 0 ? '+' : ''}${params.trendPercent}% recent search trend`
        : 'no recent trend signal available';

    return `${searchVolume}, ${cpc}, ${competition}, and ${trend} with ${params.buyerIntent.toLowerCase()} buyer intent.`;
}

function hasGoogleAdsKeywordPlannerCredentials() {
    return Boolean(
        process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
        process.env.GOOGLE_ADS_CLIENT_ID &&
        process.env.GOOGLE_ADS_CLIENT_SECRET &&
        process.env.GOOGLE_ADS_REFRESH_TOKEN &&
        process.env.GOOGLE_ADS_CUSTOMER_ID
    );
}

function hasDataForSeoCredentials() {
    return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

async function withTimeout<T>(label: string, operation: () => Promise<T>, timeoutMs = KEYWORD_PROVIDER_TIMEOUT_MS): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    try {
        return await Promise.race([
            operation(),
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

function buildFallbackReport(industry: string, location: string): KeywordOpportunityReport {
    const normalizedIndustry = normalizeIndustry(industry);
    const keywordBases = industryKeywordMap[normalizedIndustry] || [
        `${normalizedIndustry} contractor`,
        `${normalizedIndustry} service`,
        `${normalizedIndustry} repair`,
        `${normalizedIndustry} installation`,
        `${normalizedIndustry} maintenance`,
    ];

    const keywords = keywordBases.slice(0, 10).map((base, index) => {
        const localizedKeyword = sanitizeKeyword(
            index % 2 === 0
                ? `${base} in ${location}`
                : `${base} ${location}`
        );
        const buyerIntent = inferBuyerIntent(localizedKeyword);
        const competitionOutlook = inferCompetition(localizedKeyword);

        return {
            keyword: localizedKeyword,
            buyerIntent,
            competitionOutlook,
            opportunityScore: computeOpportunityScore(localizedKeyword, competitionOutlook, buyerIntent),
            suggestedAsset: inferAsset(localizedKeyword),
            rationale: buildRationale(localizedKeyword, competitionOutlook, buyerIntent),
            monthlySearchVolume: null,
            competitionScore: null,
            costPerClickUsd: null,
            trendPercent: null,
        } satisfies KeywordOpportunity;
    });

    return {
        summary: `Generated ${keywords.length} localized keyword opportunities for ${toTitleCase(industry)} in ${location}. Prioritize the low-competition commercial phrases first.`,
        location,
        industry: toTitleCase(industry),
        keywords,
        dataSource: 'TEMPLATE_FALLBACK',
        disclaimer: 'These are fallback keyword estimates, not live keyword metrics. Add DataForSEO credentials to pull real search volume, CPC, and competition data.',
    };
}

function normalizeGoogleAdsCustomerId(value: string) {
    return value.replace(/-/g, '').trim();
}

function buildGoogleAdsLocationQuery(location: string) {
    const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) return location.trim();

    const [city, stateOrRegion] = parts;
    const stateKey = stateOrRegion.toUpperCase();
    const fullState = stateNameMap[stateKey] || toTitleCase(stateOrRegion);
    return `${toTitleCase(city)}, ${fullState}`;
}

async function fetchGoogleAdsAccessToken() {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Google Ads OAuth credentials are not fully configured.');
    }

    const response = await withTimeout('Google Ads access token', async () => {
        const requestBody = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
        });

        return fetch('https://www.googleapis.com/oauth2/v3/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: requestBody.toString(),
            cache: 'no-store',
        });
    });

    const raw = await response.text();
    if (!response.ok) {
        throw new Error(`Google OAuth token request failed (${response.status}): ${raw}`);
    }

    const parsed = JSON.parse(raw) as GoogleAdsAccessTokenResponse;
    if (!parsed.access_token) {
        throw new Error('Google OAuth token response did not include an access token.');
    }

    return parsed.access_token;
}

async function googleAdsApiRequest<T>(path: string, body: Record<string, unknown>) {
    const accessToken = await fetchGoogleAdsAccessToken();
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

    if (!developerToken) {
        throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is not configured.');
    }

    const response = await withTimeout(`Google Ads API ${path}`, () => fetch(`https://googleads.googleapis.com/v22/${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'developer-token': developerToken,
            ...(loginCustomerId ? { 'login-customer-id': normalizeGoogleAdsCustomerId(loginCustomerId) } : {}),
        },
        body: JSON.stringify(body),
        cache: 'no-store',
    }));

    const raw = await response.text();
    if (!response.ok) {
        throw new Error(`Google Ads API request failed (${response.status}): ${raw}`);
    }

    return JSON.parse(raw) as T;
}

async function fetchGoogleAdsGeoTargetConstant(location: string) {
    const locationQuery = buildGoogleAdsLocationQuery(location);
    const response = await googleAdsApiRequest<GoogleAdsGeoSuggestionResponse>('geoTargetConstants:suggest', {
        locale: 'en',
        countryCode: 'US',
        locationNames: {
            names: [locationQuery],
        },
    });

    const suggestion = (response.geoTargetConstantSuggestions || [])
        .map((entry) => entry.geoTargetConstant)
        .find((geoTarget) => geoTarget?.resourceName && geoTarget.status === 'ENABLED');

    return suggestion?.resourceName || null;
}

function normalizeCompetitionFromGoogleAds(rawCompetition: string | undefined, competitionScore: number | null) {
    if (rawCompetition === 'LOW') return 'LOW' as const;
    if (rawCompetition === 'MEDIUM') return 'MEDIUM' as const;
    if (rawCompetition === 'HIGH') return 'HIGH' as const;
    return deriveCompetitionOutlook(competitionScore, rawCompetition || '');
}

function computeTrendPercent(monthlySearchVolumes: Array<{ year?: string | number; month?: string; monthlySearches?: string | number }> | undefined) {
    if (!monthlySearchVolumes || monthlySearchVolumes.length < 6) {
        return null;
    }

    const values = monthlySearchVolumes
        .map((entry) => parseMetricNumber(entry.monthlySearches))
        .filter((value): value is number => value !== null);

    if (values.length < 6) {
        return null;
    }

    const recent = values.slice(0, 3).reduce((sum, value) => sum + value, 0);
    const prior = values.slice(3, 6).reduce((sum, value) => sum + value, 0);

    if (prior <= 0) {
        return recent > 0 ? 100 : null;
    }

    return Math.round(((recent - prior) / prior) * 100);
}

async function fetchGoogleAdsKeywordPlannerReport(industry: string, location: string): Promise<KeywordOpportunityReport | null> {
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    if (!customerId) {
        return null;
    }

    const seedKeywords = buildSeedKeywords(industry, location).slice(0, 10);
    const geoTargetConstant = await fetchGoogleAdsGeoTargetConstant(location).catch((error) => {
        console.error('Google Ads geo target lookup failed, falling back to keyword-only targeting.', error);
        return null;
    });

    const response = await googleAdsApiRequest<GoogleAdsKeywordIdeaResponse>(`customers/${normalizeGoogleAdsCustomerId(customerId)}:generateKeywordIdeas`, {
        language: 'languageConstants/1000',
        ...(geoTargetConstant ? { geoTargetConstants: [geoTargetConstant] } : {}),
        keywordPlanNetwork: 'GOOGLE_SEARCH_AND_PARTNERS',
        keywordSeed: {
            keywords: seedKeywords,
        },
    });

    type RankedKeywordOpportunity = KeywordOpportunity & { relevanceScore: number };

    const rankedKeywords = (response.results || [])
        .map((item) => {
            const keyword = sanitizeKeyword(item.text || '');
            if (!keyword) return null;

            const metrics = item.keywordIdeaMetrics;
            const monthlySearchVolume = parseMetricNumber(metrics?.avgMonthlySearches);
            const competitionScore = normalizeCompetitionScore(
                null,
                parseMetricNumber(metrics?.competitionIndex),
            );
            const trendPercent = computeTrendPercent(metrics?.monthlySearchVolumes);
            const competitionOutlook = normalizeCompetitionFromGoogleAds(metrics?.competition, competitionScore);
            const highBidMicros = parseMetricNumber(metrics?.highTopOfPageBidMicros);
            const lowBidMicros = parseMetricNumber(metrics?.lowTopOfPageBidMicros);
            const cpcMicros = highBidMicros ?? lowBidMicros;
            const cpc = typeof cpcMicros === 'number' ? cpcMicros / 1_000_000 : null;
            const buyerIntent = inferBuyerIntent(keyword);

            return {
                keyword,
                buyerIntent,
                competitionOutlook,
                opportunityScore: Math.min(
                    100,
                    computeRealOpportunityScore({
                        keyword,
                        buyerIntent,
                        competitionScore,
                        monthlySearchVolume,
                        costPerClickUsd: cpc,
                    }) + (typeof trendPercent === 'number' && trendPercent > 0 ? Math.min(12, Math.round(trendPercent / 10)) : 0),
                ),
                suggestedAsset: inferAsset(keyword),
                rationale: buildRealMetricRationale({
                    keyword,
                    monthlySearchVolume,
                    costPerClickUsd: cpc,
                    competitionScore,
                    competitionOutlook,
                    buyerIntent,
                    trendPercent,
                }),
                monthlySearchVolume,
                competitionScore,
                costPerClickUsd: cpc,
                trendPercent,
                relevanceScore: scoreKeywordRelevance(keyword, industry, location),
            } as RankedKeywordOpportunity;
        })
        .filter((item): item is RankedKeywordOpportunity => item !== null)
        .sort((left, right) => {
            const leftTrend = left.trendPercent ?? Number.NEGATIVE_INFINITY;
            const rightTrend = right.trendPercent ?? Number.NEGATIVE_INFINITY;
            if (rightTrend !== leftTrend) return rightTrend - leftTrend;
            if (right.relevanceScore !== left.relevanceScore) return right.relevanceScore - left.relevanceScore;
            if ((right.monthlySearchVolume || 0) !== (left.monthlySearchVolume || 0)) {
                return (right.monthlySearchVolume || 0) - (left.monthlySearchVolume || 0);
            }
            return right.opportunityScore - left.opportunityScore;
        });

    const keywords = rankedKeywords
        .filter((item, index, values) => values.findIndex((entry) => entry.keyword.toLowerCase() === item.keyword.toLowerCase()) === index)
        .slice(0, 20)
        .map((item) => {
            const { relevanceScore, ...rest } = item;
            void relevanceScore;
            return rest;
        });

    if (keywords.length === 0) {
        return null;
    }

    return {
        summary: `Pulled ${keywords.length} live keyword opportunities for ${toTitleCase(industry)} in ${location} from Google Keyword Planner data. Results are ranked toward recent trend movement, search volume, and buyer intent.`,
        location,
        industry: toTitleCase(industry),
        keywords,
        dataSource: 'GOOGLE_ADS_KEYWORD_PLANNER',
        disclaimer: 'Live keyword metrics are sourced from Google Ads Keyword Planner via the Google Ads API. Trend direction is derived from recent monthly search-volume movement in the returned historical metrics.',
    };
}

function buildSeedKeywords(industry: string, location: string) {
    const normalizedIndustry = normalizeIndustry(industry);
    const keywordBases = industryKeywordMap[normalizedIndustry] || [
        `${normalizedIndustry} contractor`,
        `${normalizedIndustry} service`,
        `${normalizedIndustry} repair`,
        `${normalizedIndustry} installation`,
        `${normalizedIndustry} maintenance`,
    ];

    return keywordBases
        .flatMap((base) => [
            sanitizeKeyword(`${base} ${location}`),
            sanitizeKeyword(`${base} in ${location}`),
        ])
        .filter((keyword, index, values) => values.indexOf(keyword) === index)
        .slice(0, 20);
}

function buildLocationName(location: string) {
    if (/^\d{5}(?:-\d{4})?$/.test(location.trim())) {
        return null;
    }

    const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) {
        return null;
    }

    if (parts.length === 1) {
        return `${toTitleCase(parts[0])},United States`;
    }

    const [city, stateOrRegion] = parts;
    const stateKey = stateOrRegion.toUpperCase();
    const fullState = stateNameMap[stateKey] || toTitleCase(stateOrRegion);
    return `${toTitleCase(city)},${fullState},United States`;
}

function buildLocationTokens(location: string) {
    return location
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 2 && !/^\d+$/.test(token));
}

function scoreKeywordRelevance(keyword: string, industry: string, location: string) {
    const lowerKeyword = keyword.toLowerCase();
    const locationTokens = buildLocationTokens(location);
    const industryTokens = normalizeIndustry(industry).split(/\s+/).filter(Boolean);

    let score = 0;

    locationTokens.forEach((token) => {
        if (lowerKeyword.includes(token)) score += 6;
    });

    industryTokens.forEach((token) => {
        if (lowerKeyword.includes(token)) score += 5;
    });

    if (/(contractor|service|repair|replacement|installer|maintenance|commercial|emergency)/i.test(keyword)) score += 6;
    if (keyword.split(/\s+/).length >= 4) score += 4;

    return score;
}

async function fetchDataForSeoKeywordReport(industry: string, location: string): Promise<KeywordOpportunityReport | null> {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
        return null;
    }

    const seedKeywords = buildSeedKeywords(industry, location);
    const locationName = buildLocationName(location);
    const body = [{
        keywords: seedKeywords,
        language_name: 'English',
        include_seed_keyword: true,
        limit: 100,
        ...(locationName ? { location_name: locationName } : {}),
    }];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), KEYWORD_PROVIDER_TIMEOUT_MS);

    let response: Response;
    try {
        response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            cache: 'no-store',
            signal: controller.signal,
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`DataForSEO request timed out after ${Math.round(KEYWORD_PROVIDER_TIMEOUT_MS / 1000)} seconds.`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }

    const raw = await response.text();

    if (!response.ok) {
        throw new Error(`DataForSEO request failed (${response.status}): ${raw}`);
    }

    const parsed = JSON.parse(raw) as DataForSeoResponse;
    const items = parsed.tasks?.[0]?.result?.[0]?.items || [];

    if (items.length === 0) {
        return null;
    }

    type RankedKeywordOpportunity = KeywordOpportunity & { relevanceScore: number };

    const rankedKeywords = items
        .map((item) => {
            const keyword = sanitizeKeyword(item.keyword || '');
            if (!keyword) return null;

            const buyerIntent = inferBuyerIntent(keyword);
            const competitionScore = normalizeCompetitionScore(item.competition ?? null, item.competition_index ?? null);
            const competitionOutlook = deriveCompetitionOutlook(competitionScore, keyword);
            const cpc = typeof item.cpc === 'number'
                ? item.cpc
                : typeof item.high_top_of_page_bid === 'number'
                    ? item.high_top_of_page_bid
                    : typeof item.low_top_of_page_bid === 'number'
                        ? item.low_top_of_page_bid
                        : null;
            const monthlySearchVolume = typeof item.search_volume === 'number' ? item.search_volume : null;

            return {
                keyword,
                buyerIntent,
                competitionOutlook,
                opportunityScore: computeRealOpportunityScore({
                    keyword,
                    buyerIntent,
                    competitionScore,
                    monthlySearchVolume,
                    costPerClickUsd: cpc,
                }),
                suggestedAsset: inferAsset(keyword),
                rationale: buildRealMetricRationale({
                    keyword,
                    monthlySearchVolume,
                    costPerClickUsd: cpc,
                    competitionScore,
                    competitionOutlook,
                    buyerIntent,
                    trendPercent: null,
                }),
                monthlySearchVolume,
                competitionScore,
                costPerClickUsd: cpc,
                trendPercent: null,
                relevanceScore: scoreKeywordRelevance(keyword, industry, location),
            } as RankedKeywordOpportunity;
        })
        .filter((item): item is RankedKeywordOpportunity => item !== null)
        .sort((left, right) => {
            if (right.relevanceScore !== left.relevanceScore) return right.relevanceScore - left.relevanceScore;
            if ((right.monthlySearchVolume || 0) !== (left.monthlySearchVolume || 0)) {
                return (right.monthlySearchVolume || 0) - (left.monthlySearchVolume || 0);
            }
            return right.opportunityScore - left.opportunityScore;
        });

    const keywords = rankedKeywords
        .filter((item, index, values) => values.findIndex((entry) => entry.keyword.toLowerCase() === item.keyword.toLowerCase()) === index)
        .slice(0, 20)
        .map((item) => {
            const { relevanceScore, ...rest } = item;
            void relevanceScore;
            return rest;
        });

    if (keywords.length === 0) {
        return null;
    }

    return {
        summary: `Pulled ${keywords.length} live keyword opportunities for ${toTitleCase(industry)} in ${location} using Google Ads data via DataForSEO. Sort by search volume, CPC, competition, or opportunity score.`,
        location,
        industry: toTitleCase(industry),
        keywords,
        dataSource: 'DATAFORSEO_GOOGLE_ADS',
        disclaimer: 'Live keyword metrics are sourced from Google Ads data via DataForSEO. Values reflect provider-reported average monthly search volume, paid competition, and CPC, not internal estimates.',
    };
}

async function buildAiEstimateReport(industry: string, location: string): Promise<KeywordOpportunityReport> {
    const normalizedIndustry = toTitleCase(industry.trim());
    const normalizedLocation = location.trim();

    if (!normalizedIndustry || !normalizedLocation || !process.env.OPENAI_API_KEY) {
        return buildFallbackReport(industry, location);
    }

    const prompt = `
You are an expert local SEO strategist for home service businesses.

Generate localized long-tail keyword opportunities for:
- Industry: ${normalizedIndustry}
- Location: ${normalizedLocation}

Requirements:
1. Return exactly 12 long-tail keywords.
2. Every keyword must clearly relate to the industry and location.
3. Favor commercial-intent and service-intent phrases over generic informational phrases.
4. Competition outlook must be directional only: LOW, MEDIUM, or HIGH.
5. Opportunity score must be an integer from 1 to 100 and should reward local specificity, purchase intent, and lower competition.
6. Suggested asset must be one of: Location Page, Service Page, Blog Article, FAQ Cluster.
7. Rationale must be one sentence and concise.
8. Avoid obviously spammy phrases or keyword stuffing.

Output valid JSON only with this schema:
{
  "summary": "string",
  "keywords": [
    {
      "keyword": "string",
      "buyerIntent": "HIGH or MEDIUM",
      "competitionOutlook": "LOW, MEDIUM, or HIGH",
      "opportunityScore": 0,
      "suggestedAsset": "Location Page | Service Page | Blog Article | FAQ Cluster",
      "rationale": "string"
    }
  ]
}
`;

    try {
        const completion = await withTimeout('OpenAI keyword generation', () => openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.6,
        }));

        const content = completion.choices[0].message.content;
        if (!content) {
            return buildFallbackReport(industry, location);
        }

        const parsed = JSON.parse(content) as KeywordModelResponse;
        const keywords = (parsed.keywords || [])
            .slice(0, 12)
            .map((item) => {
                const keyword = sanitizeKeyword(item.keyword || '');
                const buyerIntent: KeywordBuyerIntent = item.buyerIntent === 'HIGH' ? 'HIGH' : 'MEDIUM';
                const competitionOutlook = ['LOW', 'MEDIUM', 'HIGH'].includes(item.competitionOutlook)
                    ? item.competitionOutlook as KeywordCompetitionOutlook
                    : inferCompetition(keyword);
                const suggestedAsset = ['Location Page', 'Service Page', 'Blog Article', 'FAQ Cluster'].includes(item.suggestedAsset)
                    ? item.suggestedAsset as KeywordAssetType
                    : inferAsset(keyword);

                return {
                    keyword,
                    buyerIntent,
                    competitionOutlook,
                    opportunityScore: Math.min(Math.max(Math.round(item.opportunityScore || computeOpportunityScore(keyword, competitionOutlook, buyerIntent)), 1), 100),
                    suggestedAsset,
                    rationale: item.rationale?.trim() || buildRationale(keyword, competitionOutlook, buyerIntent),
                    monthlySearchVolume: null,
                    competitionScore: null,
                    costPerClickUsd: null,
                    trendPercent: null,
                } satisfies KeywordOpportunity;
            })
            .filter((item) => item.keyword);

        if (keywords.length === 0) {
            return buildFallbackReport(industry, location);
        }

        return {
            summary: parsed.summary?.trim() || `Generated ${keywords.length} keyword opportunities for ${normalizedIndustry} in ${normalizedLocation}.`,
            location: normalizedLocation,
            industry: normalizedIndustry,
            keywords,
            dataSource: 'AI_ESTIMATE',
            disclaimer: 'These are AI-assisted keyword estimates, not live search-volume or CPC metrics. Add DataForSEO credentials to pull real search volume, CPC, and competition data.',
        };
    } catch (error) {
        console.error('Failed to generate keyword opportunity report:', error);
        return buildFallbackReport(industry, location);
    }
}

export async function generateKeywordOpportunityReport(industry: string, location: string): Promise<KeywordOpportunityReport> {
    if (hasGoogleAdsKeywordPlannerCredentials()) {
        try {
            const report = await fetchGoogleAdsKeywordPlannerReport(industry, location);
            if (report) {
                return report;
            }
        } catch (error) {
            console.error('Google Ads Keyword Planner report failed, falling back to DataForSEO/AI estimation.', error);
        }
    }

    if (hasDataForSeoCredentials()) {
        try {
            const report = await fetchDataForSeoKeywordReport(industry, location);
            if (report) {
                return report;
            }
        } catch (error) {
            console.error('DataForSEO keyword report failed, falling back to AI estimation.', error);
        }
    }

    return buildAiEstimateReport(industry, location);
}
