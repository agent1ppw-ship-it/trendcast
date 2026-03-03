import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-key-for-build',
});

export interface ArticleData {
    title: string;
    slug: string;
    excerpt: string;
    contentMarkdown: string;
    seoKeywords: string[];
}

export interface KeywordTargetedBlogDraft extends ArticleData {
    primaryKeyword: string;
    supportingKeywords: string[];
    location: string;
    industry: string;
    dataSource: 'LLM_BETA';
    generatorVersion: string;
}

export const BLOG_GENERATOR_VERSION = 'v6-llm-driven-beta';

interface PreviousDraftContext {
    title: string;
    excerpt: string;
    contentMarkdown: string;
}

type BlogAiProvider = 'anthropic' | 'openai' | 'fallback';

interface ArticleSectionPlan {
    heading: string;
    purpose: string;
    mustInclude: string[];
}

interface ArticlePlan {
    angleTitle: string;
    targetReader: string;
    coreProblem: string;
    serviceExplanation: string;
    openingApproach: string;
    structureNote: string;
    localFactors: string[];
    sections: ArticleSectionPlan[];
    questionsToAnswer: string[];
    phrasesToAvoid: string[];
    ctaStrategy: string;
}

interface JsonGenerationOptions {
    system: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
}

interface KeywordContext {
    normalizedPrimaryKeyword: string;
    normalizedSupportingKeywords: string[];
    serviceFocus: string;
    serviceTopic: string;
    readerIntent: string;
    readerQuestions: string[];
    localAngle: string;
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function normalizeKeyword(value: string) {
    return value.replace(/\s+/g, ' ').trim();
}

function getBlogAiProvider(): BlogAiProvider {
    const preference = (process.env.BLOG_AI_PROVIDER || 'auto').toLowerCase();

    if (preference === 'anthropic') {
        return process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai' : 'fallback';
    }

    if (preference === 'openai') {
        return process.env.OPENAI_API_KEY ? 'openai' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'fallback';
    }

    if (process.env.ANTHROPIC_API_KEY) {
        return 'anthropic';
    }

    if (process.env.OPENAI_API_KEY) {
        return 'openai';
    }

    return 'fallback';
}

function getOpenAiBlogModel() {
    return process.env.OPENAI_BLOG_MODEL || 'gpt-5.2';
}

function getAnthropicBlogModel() {
    return process.env.ANTHROPIC_BLOG_MODEL || 'claude-sonnet-4-20250514';
}

function extractJsonObject(raw: string) {
    const trimmed = raw.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1]?.trim() || trimmed;
    const objectStart = candidate.indexOf('{');
    const objectEnd = candidate.lastIndexOf('}');

    if (objectStart === -1 || objectEnd === -1 || objectEnd <= objectStart) {
        throw new Error('Model response did not contain a valid JSON object.');
    }

    return candidate.slice(objectStart, objectEnd + 1);
}

async function generateJsonWithAnthropic<T>({
    system,
    prompt,
    temperature = 0.7,
    maxTokens = 5000,
}: JsonGenerationOptions): Promise<T> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not configured.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: getAnthropicBlogModel(),
            max_tokens: maxTokens,
            temperature,
            system,
            messages: [
                {
                    role: 'user',
                    content: `${prompt}\n\nReturn valid JSON only. Do not wrap the JSON in markdown fences.`,
                },
            ],
        }),
        cache: 'no-store',
    });

    const raw = await response.text();

    if (!response.ok) {
        throw new Error(`Anthropic request failed (${response.status}): ${raw}`);
    }

    const parsed = JSON.parse(raw) as {
        content?: Array<{ type?: string; text?: string }>;
    };

    const text = parsed.content
        ?.filter((entry) => entry.type === 'text' && entry.text)
        .map((entry) => entry.text)
        .join('\n')
        .trim();

    if (!text) {
        throw new Error('Anthropic returned an empty response.');
    }

    return JSON.parse(extractJsonObject(text)) as T;
}

async function generateJsonWithOpenAi<T>({
    system,
    prompt,
    temperature = 0.7,
}: JsonGenerationOptions): Promise<T> {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured.');
    }

    const completion = await openai.chat.completions.create({
        model: getOpenAiBlogModel(),
        messages: [
            { role: 'system', content: system },
            {
                role: 'user',
                content: `${prompt}\n\nReturn valid JSON only. Do not wrap the JSON in markdown fences.`,
            },
        ],
        response_format: { type: 'json_object' },
        temperature,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
        throw new Error('OpenAI returned an empty response.');
    }

    return JSON.parse(extractJsonObject(responseContent)) as T;
}

async function generateJson<T>(options: JsonGenerationOptions): Promise<T> {
    const provider = getBlogAiProvider();

    if (provider === 'anthropic') {
        return generateJsonWithAnthropic<T>(options);
    }

    if (provider === 'openai') {
        return generateJsonWithOpenAi<T>(options);
    }

    throw new Error('No AI provider is configured for blog generation.');
}

function toTitleCase(value: string) {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function dedupeKeywords(primaryKeyword: string, supportingKeywords: string[]) {
    const normalizedPrimaryKeyword = normalizeKeyword(primaryKeyword);
    const normalizedSupportingKeywords = supportingKeywords
        .map(normalizeKeyword)
        .filter(Boolean)
        .filter((keyword) => keyword.toLowerCase() !== normalizedPrimaryKeyword.toLowerCase())
        .filter((keyword, index, values) => (
            values.findIndex((entry) => entry.toLowerCase() === keyword.toLowerCase()) === index
        ))
        .slice(0, 4);

    return {
        normalizedPrimaryKeyword,
        normalizedSupportingKeywords,
    };
}

function extractServiceTopic(primaryKeyword: string, industry: string, location: string) {
    const fillerWords = new Set([
        'a',
        'an',
        'and',
        'best',
        'business',
        'company',
        'companies',
        'contractor',
        'contractors',
        'expert',
        'experts',
        'for',
        'in',
        'local',
        'near',
        'service',
        'services',
        'the',
    ]);

    const industryTokens = normalizeKeyword(industry).toLowerCase().split(/\s+/).filter(Boolean);
    const locationTokens = normalizeKeyword(location).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const remainingTokens = normalizeKeyword(primaryKeyword)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token && !locationTokens.includes(token) && !fillerWords.has(token));

    const topicTokens = [...remainingTokens];

    industryTokens.forEach((industryToken) => {
        if (!topicTokens.includes(industryToken)) {
            topicTokens.push(industryToken);
        }
    });

    const dedupedTokens = topicTokens.filter((token, index) => topicTokens.indexOf(token) === index);

    const topic = dedupedTokens.join(' ').trim();
    return topic.length >= 4 ? topic : normalizeKeyword(primaryKeyword);
}

function buildReadableServiceLabel(context: KeywordContext, industry: string) {
    const lowerIndustry = industry.toLowerCase();
    let label = context.serviceTopic.toLowerCase();

    if (!label.includes(lowerIndustry)) {
        if (label === 'commercial' || label === 'residential') {
            label = `${label} ${lowerIndustry}`;
        } else {
            label = `${label} ${lowerIndustry}`.trim();
        }
    }

    return label.replace(/\s+/g, ' ').trim();
}

function buildKeywordContext(
    primaryKeyword: string,
    supportingKeywords: string[],
    industry: string,
    location: string,
): KeywordContext {
    const { normalizedPrimaryKeyword, normalizedSupportingKeywords } = dedupeKeywords(primaryKeyword, supportingKeywords);
    const lowerKeyword = normalizedPrimaryKeyword.toLowerCase();
    const lowerIndustry = industry.toLowerCase();
    const serviceTopic = extractServiceTopic(normalizedPrimaryKeyword, industry, location);

    const intentPatterns = [
        {
            matches: ['commercial', 'business', 'office', 'retail', 'warehouse'],
            serviceFocus: `commercial ${lowerIndustry} work`,
            readerIntent: 'The customer is likely comparing vendors for a business property and needs clarity on scope, disruption, reliability, and fit.',
            readerQuestions: [
                `What does this ${lowerIndustry} service usually include for a commercial property?`,
                'How do scheduling, access, and disruption affect the project?',
                'What makes one contractor more qualified than another for this kind of property?',
            ],
        },
        {
            matches: ['repair', 'fix', 'emergency', 'broken', 'replace'],
            serviceFocus: `${lowerIndustry} diagnosis and repair`,
            readerIntent: 'The customer likely has an immediate issue and needs to understand urgency, likely causes, and what should be inspected first.',
            readerQuestions: [
                'What signs suggest the problem should be handled quickly?',
                'What should a contractor inspect before recommending a repair?',
                'When does repair make sense and when is replacement the better choice?',
            ],
        },
        {
            matches: ['install', 'installation', 'design', 'build', 'new'],
            serviceFocus: `${lowerIndustry} installation and planning`,
            readerIntent: 'The customer is planning a project and needs practical guidance on process, planning decisions, and the factors that shape the final result.',
            readerQuestions: [
                'What planning decisions matter most before the work starts?',
                'Which material, layout, or design choices affect the result the most?',
                'What should a customer review before approving the final plan?',
            ],
        },
        {
            matches: ['maintenance', 'tune up', 'inspection', 'cleaning', 'service'],
            serviceFocus: `${lowerIndustry} maintenance and preventive service`,
            readerIntent: 'The customer is trying to prevent larger problems and wants to know what the service covers and when it is worth scheduling.',
            readerQuestions: [
                'What does this maintenance service usually include?',
                'How often should the work be scheduled?',
                'Which issues can preventive service help reduce?',
            ],
        },
        {
            matches: ['cost', 'price', 'estimate', 'quote'],
            serviceFocus: `${lowerIndustry} pricing and project scope`,
            readerIntent: 'The customer is trying to understand pricing and wants a practical explanation of cost drivers without a fake instant quote.',
            readerQuestions: [
                'What job conditions usually affect price the most?',
                'What details should be reviewed before giving an estimate?',
                'How can a customer compare quotes intelligently?',
            ],
        },
    ];

    const matchedPattern = intentPatterns.find((pattern) => pattern.matches.some((token) => lowerKeyword.includes(token)));
    const defaultContext = {
        serviceFocus: `${lowerIndustry} services related to ${serviceTopic}`,
        readerIntent: 'The customer is searching for a specific local service and wants a clear explanation of what the work involves, when it is needed, and how to evaluate providers.',
        readerQuestions: [
            `What does ${serviceTopic} usually include?`,
            `When should someone in ${location} hire a professional for this type of work?`,
            'What should a customer look for before choosing a contractor?',
        ],
    };

    const baseContext = matchedPattern || defaultContext;

    return {
        normalizedPrimaryKeyword,
        normalizedSupportingKeywords,
        serviceFocus: baseContext.serviceFocus,
        serviceTopic,
        readerIntent: baseContext.readerIntent,
        readerQuestions: baseContext.readerQuestions,
        localAngle: `Keep the advice grounded in realistic project conditions, climate, property constraints, and contractor expectations in ${location}.`,
    };
}

function stripLeadingH1(markdown: string) {
    return markdown.replace(/^#\s.+\n+/m, '').trim();
}

function sanitizeGeneratedMarkdown(markdown: string, context: KeywordContext) {
    const serviceHeading = toTitleCase(context.serviceTopic);
    let content = stripLeadingH1(markdown || '');

    const headingReplacements: Array<[RegExp, string]> = [
        [/^##\s*What People Usually Mean When They Search[^\n]*$/gim, `## What ${serviceHeading} Usually Includes`],
        [/^##\s*The Reader Intent Behind This Search$/gim, '## When This Service Makes Sense'],
        [/^##\s*Questions The Article Should Answer Clearly$/gim, '## Questions To Ask Before Hiring A Contractor'],
        [/^##\s*How To Cover Supporting Keywords Without Forcing Them$/gim, '## Related Project Considerations'],
        [/^##\s*What Makes The Content Valuable For A Local Reader$/gim, `## What Property Owners In ${context.localAngle.match(/in (.+)\.$/)?.[1] || 'Your Area'} Should Know`],
    ];

    headingReplacements.forEach(([pattern, replacement]) => {
        content = content.replace(pattern, replacement);
    });

    const phraseReplacements: Array<[RegExp, string]> = [
        [/\bwhen people search for\b/gi, 'when a customer needs'],
        [/\bthis search\b/gi, 'this type of project'],
        [/\breader intent\b/gi, 'customer needs'],
        [/\bsearcher\b/gi, 'customer'],
        [/\bkeyword stuffing\b/gi, 'forced phrasing'],
        [/\bprimary keyword\b/gi, 'main topic'],
        [/\bsupporting keywords\b/gi, 'related topics'],
    ];

    phraseReplacements.forEach(([pattern, replacement]) => {
        content = content.replace(pattern, replacement);
    });

    const structuralReplacements: Array<[RegExp, string]> = [
        [
            /When a customer needs\s+\*\*?[^.\n]+?\*?\*?, they are usually trying to solve a specific service problem, not just browsing\.\s*/gi,
            `Customers looking into ${context.serviceTopic} are usually trying to solve a real property or operational problem. `,
        ],
        [
            /They want to understand what the job involves, when it makes sense to call a professional, and what separates a qualified provider from a generic one\.\s*/gi,
            'They need a clear explanation of the work, the scope, and what makes one approach or contractor a better fit than another. ',
        ],
        [
            /In this case, the real topic is\s+\*\*?[^.\n]+?\*?\*?\.\s*/gi,
            `For this kind of project, the useful conversation is about ${context.serviceFocus}, how the work is scoped, and what decisions matter before anything is approved. `,
        ],
        [
            /This type of project usually signals the following need:\s*/gi,
            'At this stage, most customers need:\n',
        ],
        [
            /This version takes a different angle from the prior draft and focuses on[^.\n]*\.\s*/gi,
            '',
        ],
        [
            /In this version, the central lens is[^.\n]*\.\s*/gi,
            '',
        ],
        [
            /For this version,? /gi,
            '',
        ],
    ];

    structuralReplacements.forEach(([pattern, replacement]) => {
        content = content.replace(pattern, replacement);
    });

    return content
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function sanitizeArticleData(
    parsedData: ArticleData,
    fallbackTitle: string,
    fallbackSlug: string,
    fallbackExcerpt: string,
    fallbackKeywords: string[],
    context?: KeywordContext,
): ArticleData {
    const cleanedMarkdown = context
        ? sanitizeGeneratedMarkdown(parsedData.contentMarkdown || '', context)
        : stripLeadingH1(parsedData.contentMarkdown || '');

    return {
        title: parsedData.title?.trim() || fallbackTitle,
        slug: parsedData.slug?.trim() || fallbackSlug,
        excerpt: parsedData.excerpt?.trim() || fallbackExcerpt,
        contentMarkdown: cleanedMarkdown,
        seoKeywords: parsedData.seoKeywords?.map(normalizeKeyword).filter(Boolean).slice(0, 5) || fallbackKeywords,
    };
}

async function planKeywordTargetedArticle(
    context: KeywordContext,
    location: string,
    industry: string,
    regenerationSeed?: string,
    previousDraft?: PreviousDraftContext,
) {
    return generateJson<ArticlePlan>({
        system: 'You are a senior editorial strategist for local service companies. Plan articles that feel like strong human editorial work, not SEO templates or repeatable content blocks.',
        prompt: `
Plan a local service article before it is written.

Inputs:
- Industry: ${industry}
- Location: ${location}
- Primary topic: ${context.normalizedPrimaryKeyword}
- Related topics:
${context.normalizedSupportingKeywords.map((keyword) => `  - ${keyword}`).join('\n') || '  - none'}
- Core service focus: ${context.serviceFocus}
- Customer need: ${context.readerIntent}
- Local angle: ${context.localAngle}
- Draft variation seed: ${regenerationSeed || 'initial-draft'}
${previousDraft ? `- Previous draft title to avoid echoing: ${previousDraft.title}\n- Previous draft excerpt to avoid echoing: ${previousDraft.excerpt}` : ''}

Requirements:
1. Build the outline around the real customer problem, not the keyword phrasing.
2. Pick a natural editorial angle that fits this subject. Do not force the article into a predetermined template.
3. Make this version structurally distinct from prior drafts if one exists. Change the opening logic, section order, and narrative rhythm when appropriate.
4. Avoid formulaic SEO framing and avoid headings that sound like keyword-analysis language.
5. Return 4 to 6 sections with distinct purposes.
6. Include practical local considerations such as climate, property type, permitting, material performance, scheduling, access, or maintenance where relevant.
7. The title angle should feel natural and editorial, not like a templated landing page.
8. Choose a structure that genuinely suits the topic. It can be explanatory, diagnostic, comparative, process-driven, checklist-based, or cautionary, but only if it fits the subject.

Return JSON with this shape:
{
  "angleTitle": "string",
  "targetReader": "string",
  "coreProblem": "string",
  "serviceExplanation": "string",
  "openingApproach": "string",
  "structureNote": "string",
  "localFactors": ["string"],
  "sections": [
    {
      "heading": "string",
      "purpose": "string",
      "mustInclude": ["string"]
    }
  ],
  "questionsToAnswer": ["string"],
  "phrasesToAvoid": ["string"],
  "ctaStrategy": "string"
}
`.trim(),
        temperature: 0.9,
        maxTokens: 2200,
    });
}

async function writeKeywordTargetedArticle(
    plan: ArticlePlan,
    context: KeywordContext,
    location: string,
    businessName: string,
    industry: string,
    previousDraft?: PreviousDraftContext,
) {
    return generateJson<ArticleData>({
        system: 'You write local service articles that read like strong human editorial work. The article must help the customer understand the job, the decisions, and the tradeoffs in plain language.',
        prompt: `
Write a blog article using this article plan.

Business:
- Company name: ${businessName}
- Industry: ${industry}
- Location: ${location}

Topic context:
- Primary topic: ${context.normalizedPrimaryKeyword}
- Related topics:
${context.normalizedSupportingKeywords.map((keyword) => `  - ${keyword}`).join('\n') || '  - none'}
- Service focus: ${context.serviceFocus}

Approved plan:
${JSON.stringify(plan, null, 2)}

${previousDraft ? `Previous draft to avoid mirroring too closely:\n${JSON.stringify(previousDraft, null, 2)}` : ''}

Requirements:
1. Write a complete article that follows the plan but sounds natural, not procedural.
2. The article should be useful even if the reader never notices the keyword targeting.
3. Mention the primary topic early, then write naturally. Do not force every keyword phrase into every section.
4. Do not discuss SEO, search intent, keywords, or what people mean when they search.
5. Do not use stock headings like "What People Usually Mean..." or "Reader Intent".
6. Use markdown with H2 and H3 subheadings, short 2 to 4 sentence paragraphs, and bullets only where they improve readability.
7. Do not include images or image placeholders.
8. The H1 is rendered outside the markdown body, so do not include an H1 in contentMarkdown.
9. Keep the CTA near the end and make it practical, local, and calm.
10. Target at least 900 words.
11. Let the article find its own rhythm. If the topic needs a sharper opening, a process walkthrough, a comparison section, or a cautionary section, do that naturally instead of forcing a fixed pattern.
12. Prefer concrete, useful phrasing over generic copy. If a sentence sounds templated, rewrite it.

Return JSON only:
{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "contentMarkdown": "string",
  "seoKeywords": ["string"]
}
`.trim(),
        temperature: 0.82,
        maxTokens: 5200,
    });
}

async function editKeywordTargetedArticle(
    draft: ArticleData,
    plan: ArticlePlan,
    context: KeywordContext,
    location: string,
    businessName: string,
    industry: string,
) {
    return generateJson<ArticleData>({
        system: 'You are a senior editor rewriting AI-assisted drafts to sound natural, specific, and reader-first. Remove robotic phrasing, repetitive structure, and any meta language.',
        prompt: `
Edit this local service article so it reads like polished human-written editorial content.

Business:
- Company name: ${businessName}
- Industry: ${industry}
- Location: ${location}

Topic context:
- Primary topic: ${context.normalizedPrimaryKeyword}
- Related topics:
${context.normalizedSupportingKeywords.map((keyword) => `  - ${keyword}`).join('\n') || '  - none'}

Editorial plan:
${JSON.stringify(plan, null, 2)}

Draft to edit:
${JSON.stringify(draft, null, 2)}

Edit rules:
1. Improve natural phrasing and sentence flow.
2. Remove anything that sounds like internal prompting, SEO analysis, or template boilerplate.
3. Vary the paragraph rhythm and transitions so the article does not feel machine-generated.
4. Keep the article logically complete and practically useful.
5. Preserve markdown structure and keep paragraphs short.
6. Keep the piece specific to ${location} where that adds value, but do not force the location into every paragraph.
7. Keep the CTA local and reader-appropriate.
8. Remove any repeated article-template feel. If multiple headings or transitions feel generic, rewrite them so the piece feels like its own article.
9. If the draft reads like a generic service page, rewrite it into something more observational, explanatory, and specific.

Return JSON only:
{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "contentMarkdown": "string",
  "seoKeywords": ["string"]
}
`.trim(),
        temperature: 0.7,
        maxTokens: 5200,
    });
}

export async function generateLocalSEOArticle(
    topic: string,
    location: string,
    businessName: string,
): Promise<ArticleData | null> {
    const prompt = `
You are an expert SEO copywriter specializing in local home service businesses.

Write a comprehensive, highly informative blog article about "${topic}" for property owners in "${location}".

The article is being published by "${businessName}". Position the business naturally near the end as a provider, but keep the article educational first.

Requirements:
1. Write a compelling title containing the location.
2. Write a 2-sentence excerpt summarizing the post.
3. The article must read like a practical service guide for a real customer, not like SEO copy.
4. Explain the underlying service problem, what the service includes, when someone should call, and what decision factors matter most.
5. Do not talk about keywords, SEO strategy, search intent, or what people mean when they search.
6. Do not include images, markdown image tags, or placeholder image URLs anywhere in the content.
7. Use markdown with:
   - scannable H2 and H3 subheadings
   - short paragraphs of 2 to 4 sentences
   - bullet points where useful
   - a strong CTA section near the end
8. The page title will be rendered as the H1 outside the markdown body, so do not repeat the H1 inside contentMarkdown.
9. Include exactly 5 long-tail SEO keywords.

Output format MUST be a valid JSON object matching this schema:
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "contentMarkdown": "...",
  "seoKeywords": ["..."]
}
`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You write practical local service articles for real customers. You do not write meta commentary about searching, SEO, or keywords.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.55,
        });

        const responseContent = completion.choices[0].message.content;
        if (!responseContent) return null;

        return sanitizeArticleData(
            JSON.parse(responseContent) as ArticleData,
            `${topic} in ${location}`,
            slugify(`${topic} ${location}`),
            `${businessName} explains what property owners should know about ${topic} in ${location}.`,
            [topic, `${topic} ${location}`].map(normalizeKeyword),
        );
    } catch (error) {
        console.error('Failed to generate article:', error);
        return null;
    }
}

export async function generateKeywordTargetedBlogArticle(
    primaryKeyword: string,
    supportingKeywords: string[],
    location: string,
    businessName: string,
    industry: string,
    regenerationSeed?: string,
    previousDraft?: PreviousDraftContext,
): Promise<KeywordTargetedBlogDraft> {
    const context = buildKeywordContext(primaryKeyword, supportingKeywords, industry, location);
    const fallbackKeywords = [context.normalizedPrimaryKeyword, ...context.normalizedSupportingKeywords].slice(0, 5);

    if (getBlogAiProvider() === 'fallback') {
        throw new Error('Blog generator beta requires a configured language model. Add OPENAI_API_KEY or ANTHROPIC_API_KEY.');
    }

    const fallbackTitle = `${toTitleCase(context.normalizedPrimaryKeyword)} in ${location}`;
    const fallbackSlug = slugify(`${context.normalizedPrimaryKeyword} ${location}`);
    const fallbackExcerpt = `${businessName} explains what local customers should know about ${buildReadableServiceLabel(context, industry)} in ${location}.`;

    try {
        const plan = await planKeywordTargetedArticle(
            context,
            location,
            industry,
            regenerationSeed,
            previousDraft,
        );

        const rawDraft = await writeKeywordTargetedArticle(
            plan,
            context,
            location,
            businessName,
            industry,
            previousDraft,
        );

        let editedDraft = rawDraft;

        try {
            editedDraft = await editKeywordTargetedArticle(
                rawDraft,
                plan,
                context,
                location,
                businessName,
                industry,
            );
        } catch (editorError) {
            console.error('Blog draft editor pass failed, using writer output.', editorError);
        }

        const parsedData = sanitizeArticleData(
            editedDraft,
            fallbackTitle,
            fallbackSlug,
            fallbackExcerpt,
            fallbackKeywords,
            context,
        );

        return {
            title: parsedData.title,
            slug: parsedData.slug || fallbackSlug,
            excerpt: parsedData.excerpt,
            contentMarkdown: parsedData.contentMarkdown,
            seoKeywords: parsedData.seoKeywords?.length ? parsedData.seoKeywords : fallbackKeywords,
            primaryKeyword: context.normalizedPrimaryKeyword,
            supportingKeywords: context.normalizedSupportingKeywords,
            location,
            industry,
            dataSource: 'LLM_BETA',
            generatorVersion: BLOG_GENERATOR_VERSION,
        };
    } catch (error) {
        console.error('Failed to generate keyword-targeted blog article:', error);
        throw new Error(error instanceof Error ? error.message : 'Blog generator beta failed to get a valid LLM response.');
    }
}
