import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-key-for-build',
});

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
}

export interface KeywordOpportunityReport {
    summary: string;
    location: string;
    industry: string;
    keywords: KeywordOpportunity[];
    dataSource: 'AI_ESTIMATE' | 'TEMPLATE_FALLBACK';
    disclaimer: string;
}

type KeywordModelResponse = {
    summary: string;
    keywords: KeywordOpportunity[];
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
    return /(contractor|service|repair|replacement|installer|inspection|maintenance|emergency)/i.test(keyword)
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

function computeOpportunityScore(keyword: string, competitionOutlook: KeywordCompetitionOutlook, buyerIntent: KeywordBuyerIntent) {
    let score = 55;

    if (buyerIntent === 'HIGH') score += 18;
    if (competitionOutlook === 'LOW') score += 17;
    if (competitionOutlook === 'MEDIUM') score += 8;
    if (keyword.split(/\s+/).length >= 5) score += 6;
    if (/(commercial|emergency|refrigeration|storm damage|drainage|tenant buildout|soft wash)/i.test(keyword)) score += 8;

    return Math.min(score, 98);
}

function buildRationale(keyword: string, competition: KeywordCompetitionOutlook, intent: KeywordBuyerIntent) {
    const specificity = keyword.split(/\s+/).length >= 6 ? 'highly specific' : 'locally specific';
    return `${specificity} phrase with ${intent.toLowerCase()} buyer intent and ${competition.toLowerCase()} competition outlook for service-area SEO.`;
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
        };
    });

    return {
        summary: `Generated ${keywords.length} localized keyword opportunities for ${toTitleCase(industry)} in ${location}. Prioritize the low-competition commercial phrases first.`,
        location,
        industry: toTitleCase(industry),
        keywords,
        dataSource: 'TEMPLATE_FALLBACK',
        disclaimer: 'These are AI-assisted opportunity estimates, not live search-volume or CPC metrics. Connect a keyword-data provider later for verified traffic and competition data.',
    };
}

export async function generateKeywordOpportunityReport(industry: string, location: string): Promise<KeywordOpportunityReport> {
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
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.6,
        });

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
                };
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
            disclaimer: 'These are AI-assisted opportunity estimates, not live search-volume or CPC metrics. Connect a keyword-data provider later for verified traffic and competition data.',
        };
    } catch (error) {
        console.error('Failed to generate keyword opportunity report:', error);
        return buildFallbackReport(industry, location);
    }
}
