import OpenAI from 'openai';

// Assuming the API key is provided in the environment variables
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
    dataSource: 'AI_ESTIMATE' | 'TEMPLATE_FALLBACK';
}

interface KeywordContext {
    normalizedPrimaryKeyword: string;
    normalizedSupportingKeywords: string[];
    serviceFocus: string;
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

function buildKeywordContext(
    primaryKeyword: string,
    supportingKeywords: string[],
    industry: string,
    location: string,
): KeywordContext {
    const { normalizedPrimaryKeyword, normalizedSupportingKeywords } = dedupeKeywords(primaryKeyword, supportingKeywords);
    const lowerKeyword = normalizedPrimaryKeyword.toLowerCase();
    const lowerIndustry = industry.toLowerCase();

    const intentPatterns = [
        {
            matches: ['commercial', 'business', 'office', 'retail', 'warehouse'],
            serviceFocus: `commercial ${industry.toLowerCase()} work`,
            readerIntent: 'The reader is likely evaluating vendors for a business property and needs clear scope, reliability, and operational fit.',
            readerQuestions: [
                `What does this ${lowerIndustry} service usually include for a commercial property?`,
                'How do timelines, disruption, and coordination affect the project?',
                'What makes one contractor more qualified than another for this type of property?',
            ],
        },
        {
            matches: ['repair', 'fix', 'emergency', 'broken', 'replace'],
            serviceFocus: `${industry.toLowerCase()} diagnosis and repair`,
            readerIntent: 'The reader likely has an immediate problem and wants to understand urgency, likely causes, and what a contractor should inspect first.',
            readerQuestions: [
                'What signs show the problem should be addressed quickly?',
                'What should a contractor inspect before quoting a repair?',
                'When does repair make sense versus replacement?',
            ],
        },
        {
            matches: ['install', 'installation', 'design', 'build', 'new'],
            serviceFocus: `${industry.toLowerCase()} installation and planning`,
            readerIntent: 'The reader is comparing options and needs help understanding process, planning decisions, and the factors that change cost or quality.',
            readerQuestions: [
                'What planning decisions matter most before the work starts?',
                'Which features or material choices change the final result?',
                'What should the customer ask before signing off on the job?',
            ],
        },
        {
            matches: ['maintenance', 'tune up', 'inspection', 'cleaning', 'service'],
            serviceFocus: `${industry.toLowerCase()} maintenance and preventive service`,
            readerIntent: 'The reader is trying to prevent larger problems and wants practical guidance on what the service covers and when it is worth scheduling.',
            readerQuestions: [
                'What does this maintenance service usually cover?',
                'How often should the work be scheduled?',
                'Which issues can preventive service help reduce?',
            ],
        },
        {
            matches: ['cost', 'price', 'estimate', 'quote'],
            serviceFocus: `${industry.toLowerCase()} pricing and job scope`,
            readerIntent: 'The reader is trying to understand pricing and wants a useful explanation of cost drivers without a fake hard quote.',
            readerQuestions: [
                'What job conditions usually affect price the most?',
                'What details should be reviewed before giving a quote?',
                'How can a customer compare estimates intelligently?',
            ],
        },
    ];

    const matchedPattern = intentPatterns.find((pattern) => pattern.matches.some((token) => lowerKeyword.includes(token)));
    const defaultContext = {
        serviceFocus: `${industry.toLowerCase()} services related to ${normalizedPrimaryKeyword}`,
        readerIntent: 'The reader is searching for a specific local service and wants a straightforward explanation of what it involves, when it is needed, and how to choose the right provider.',
        readerQuestions: [
            `What does ${normalizedPrimaryKeyword} actually include?`,
            `When should someone in ${location} hire a professional for this work?`,
            'How should a customer evaluate providers for this kind of job?',
        ],
    };

    const baseContext = matchedPattern || defaultContext;

    return {
        normalizedPrimaryKeyword,
        normalizedSupportingKeywords,
        serviceFocus: baseContext.serviceFocus,
        readerIntent: baseContext.readerIntent,
        readerQuestions: baseContext.readerQuestions,
        localAngle: `Ground the article in realistic conditions, expectations, and service considerations for customers in ${location}.`,
    };
}

function stripLeadingH1(markdown: string) {
    return markdown.replace(/^#\s.+\n+/m, '').trim();
}

function sanitizeArticleData(
    parsedData: ArticleData,
    fallbackTitle: string,
    fallbackSlug: string,
    fallbackExcerpt: string,
    fallbackKeywords: string[],
): ArticleData {
    const contentMarkdown = stripLeadingH1(parsedData.contentMarkdown || '');

    return {
        title: parsedData.title?.trim() || fallbackTitle,
        slug: parsedData.slug?.trim() || fallbackSlug,
        excerpt: parsedData.excerpt?.trim() || fallbackExcerpt,
        contentMarkdown,
        seoKeywords: parsedData.seoKeywords?.map(normalizeKeyword).filter(Boolean).slice(0, 5) || fallbackKeywords,
    };
}

function buildFallbackBlogDraft(
    primaryKeyword: string,
    supportingKeywords: string[],
    location: string,
    businessName: string,
    industry: string,
): KeywordTargetedBlogDraft {
    const context = buildKeywordContext(primaryKeyword, supportingKeywords, industry, location);
    const title = `${context.normalizedPrimaryKeyword.replace(/\b\w/g, (char) => char.toUpperCase())}: What ${location} Customers Should Know`;
    const excerpt = `${businessName} created this localized guide to help readers understand ${context.normalizedPrimaryKeyword} in ${location}. The post is designed to answer the real service question behind the search, not just repeat the keyword.`;
    const allKeywords = [context.normalizedPrimaryKeyword, ...context.normalizedSupportingKeywords].slice(0, 5);
    const slug = slugify(`${context.normalizedPrimaryKeyword} ${location}`);

    const contentMarkdown = `
## What People Usually Mean When They Search ${context.normalizedPrimaryKeyword.replace(/\b\w/g, (char) => char.toUpperCase())}

When people search for **${context.normalizedPrimaryKeyword}**, they are usually trying to solve a specific service problem, not just browsing. They want to understand what the job involves, when it makes sense to call a professional, and what separates a qualified provider from a generic one.

In this case, the real topic is **${context.serviceFocus}**. A useful article should make that clear early and explain the decision in plain language for someone in ${location}.

## The Reader Intent Behind This Search

This search usually signals the following need:

- ${context.readerIntent}
- A contractor who can explain scope, timing, and what happens next
- Confidence that the provider understands local service expectations in ${location}

## Questions The Article Should Answer Clearly

To feel complete and useful, the post should directly answer questions like:

${context.readerQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n')}

## How To Cover Supporting Keywords Without Forcing Them

Supporting keywords should only appear when they help the reader understand a related part of the job. That means they should reinforce the main topic instead of turning the article into a list of disconnected search phrases.

${allKeywords.map((keyword) => `- ${keyword}`).join('\n')}

If a supporting phrase does not fit naturally into the explanation, it should be left out of the final article.

## What Makes The Content Valuable For A Local Reader

The strongest local SEO content works because it answers the actual service question quickly and clearly. It should explain the work, set expectations, and help a reader make a better decision, even before they contact anyone.

${context.localAngle} Short paragraphs, clear headings, and practical explanations matter more than squeezing in extra keyword variations.

## Call To Action

Strong local SEO content should make it easy for the visitor to take the next step. That means ending with a clear, direct invitation to contact **${businessName}** for help with **${context.normalizedPrimaryKeyword}** in **${location}**.

The call to action should stay natural. It should sound like a recommendation from a knowledgeable local provider, not a hard sell.

## Final Takeaway

If your goal is to rank for **${context.normalizedPrimaryKeyword}**, the content should focus on solving the reader's question with complete, useful information. That is what turns a long-tail keyword into actual pipeline activity instead of thin traffic.
`.trim();

    return {
        title,
        slug,
        excerpt,
        contentMarkdown,
        seoKeywords: allKeywords,
        primaryKeyword,
        supportingKeywords,
        location,
        industry,
        dataSource: 'TEMPLATE_FALLBACK',
    };
}

/**
 * Generates a keyword-rich, localized long-form SEO article for home service businesses.
 * Used primarily for Tier 1 and Tier 2 plans.
 * 
 * @param topic The core topic (e.g., "roof algae removal")
 * @param location The target city/neighborhood (e.g., "Austin, TX")
 * @param businessName The name of the client's business
 */
export async function generateLocalSEOArticle(
    topic: string,
    location: string,
    businessName: string
): Promise<ArticleData | null> {
    const prompt = `
    You are an expert SEO copywriter specializing in local home service businesses.
    Write a comprehensive, engaging, and highly informative blog article about "${topic}" specifically targeted for homeowners in "${location}".
    
    The article is being published by "${businessName}". You must seamlessly integrate this business name as the recommended solution at the end of the post.

    Requirements:
    1. A catchy, clickable title containing the location.
    2. A 2-sentence excerpt summarizing the post.
    3. The main content in Markdown format (at least 600 words) using:
       - scannable H2 and H3 subheadings
       - short paragraphs of 2 to 4 sentences
       - bullet points where useful
       - a strong CTA section near the end
    4. Prioritize reader value over SEO phrasing. The article must read like a complete, coherent explanation written for a real customer.
    5. Explain the underlying service problem, what the service includes, when someone should call, and what decision factors matter most.
    6. Do not include images, markdown image tags, or placeholder image URLs anywhere in the content.
    7. The page title will be rendered as the H1 outside the markdown body, so do not repeat the H1 inside contentMarkdown.
    8. A list of exactly 5 long-tail SEO keywords.

    Output format MUST be a valid JSON object matching this schema:
    {
      "title": "...",
      "slug": "...", // URL-friendly version of title
      "excerpt": "...",
      "contentMarkdown": "...",
      "seoKeywords": ["..."]
    }
  `;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });

        const responseContent = completion.choices[0].message.content;
        if (!responseContent) return null;

        return sanitizeArticleData(
            JSON.parse(responseContent) as ArticleData,
            `${topic} in ${location}`,
            slugify(`${topic} ${location}`),
            `${businessName} explains what homeowners should know about ${topic} in ${location}.`,
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
): Promise<KeywordTargetedBlogDraft> {
    const context = buildKeywordContext(primaryKeyword, supportingKeywords, industry, location);
    const fallbackKeywords = [context.normalizedPrimaryKeyword, ...context.normalizedSupportingKeywords].slice(0, 5);

    if (!process.env.OPENAI_API_KEY) {
        return buildFallbackBlogDraft(
            context.normalizedPrimaryKeyword,
            context.normalizedSupportingKeywords,
            location,
            businessName,
            industry,
        );
    }

    const prompt = `
You are an expert local SEO copywriter for home service companies.

Write a long-form blog draft that primarily targets this keyword:
- Primary keyword: ${context.normalizedPrimaryKeyword}

Supporting keywords to weave in naturally:
${context.normalizedSupportingKeywords.map((keyword) => `- ${keyword}`).join('\n') || '- none'}

Business:
- Company name: ${businessName}
- Industry: ${industry}
- Service area: ${location}

Search intent context:
- Core service focus: ${context.serviceFocus}
- Reader intent: ${context.readerIntent}
- Local context: ${context.localAngle}
- Questions that should be answered clearly:
${context.readerQuestions.map((question) => `  - ${question}`).join('\n')}

Requirements:
1. The article must feel natural, informative, and genuinely useful for a local reader.
2. Prioritize complete thoughts, practical explanation, and decision-making value over keyword repetition.
3. Do not keyword-stuff. Use the supporting keywords only where they fit naturally, and omit any that do not improve the article.
4. The first section should quickly explain what the searcher is actually trying to understand or solve.
5. The body should explain service scope, when the service is needed, what affects cost or complexity, and how to evaluate a provider.
6. Include concrete, reader-helpful detail. Avoid vague SEO filler and avoid generic statements that could apply to any service.
7. Write for a homeowner or property decision-maker, not for a search engine.
8. Write at least 900 words.
9. Use markdown with proper blog formatting:
   - H2 and H3 subheadings
   - short paragraphs of 2 to 4 sentences
   - bullet points where useful
   - no dense text walls
10. Make the primary keyword a clear SEO target in the title, excerpt, and early body copy.
11. The tone should be educational first and sales-oriented second.
12. Do not include images, markdown image tags, or placeholder image URLs anywhere in the content.
13. The page title will be rendered as the H1 outside the markdown body, so do not repeat the H1 inside contentMarkdown.
14. End with a local CTA that naturally positions ${businessName} as a provider in ${location}.

Quality bar:
- The article should still make sense and remain useful even if all supporting keywords were removed.
- Supporting keywords are secondary and should never break sentence flow.
- Avoid lists of barely-related phrases or sections that exist only to squeeze in extra keywords.
- Keep the article tightly aligned to the primary service intent behind "${context.normalizedPrimaryKeyword}".

Return valid JSON only:
{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "contentMarkdown": "string",
  "seoKeywords": ["string"]
}
`;

    const fallbackTitle = `${context.normalizedPrimaryKeyword.replace(/\b\w/g, (char) => char.toUpperCase())}: What ${location} Customers Should Know`;
    const fallbackSlug = slugify(`${context.normalizedPrimaryKeyword} ${location}`);
    const fallbackExcerpt = `${businessName} explains what local customers should know about ${context.normalizedPrimaryKeyword} in ${location}.`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You write practical, high-conviction local service articles that help real customers make better decisions. You never force keywords at the expense of clarity.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.55,
        });

        const responseContent = completion.choices[0].message.content;
        if (!responseContent) {
            return buildFallbackBlogDraft(
                context.normalizedPrimaryKeyword,
                context.normalizedSupportingKeywords,
                location,
                businessName,
                industry,
            );
        }

        const parsedData = sanitizeArticleData(
            JSON.parse(responseContent) as ArticleData,
            fallbackTitle,
            fallbackSlug,
            fallbackExcerpt,
            fallbackKeywords,
        );

        return {
            title: parsedData.title,
            slug: parsedData.slug || slugify(`${context.normalizedPrimaryKeyword} ${location}`),
            excerpt: parsedData.excerpt,
            contentMarkdown: parsedData.contentMarkdown,
            seoKeywords: parsedData.seoKeywords?.length ? parsedData.seoKeywords : fallbackKeywords,
            primaryKeyword: context.normalizedPrimaryKeyword,
            supportingKeywords: context.normalizedSupportingKeywords,
            location,
            industry,
            dataSource: 'AI_ESTIMATE',
        };
    } catch (error) {
        console.error('Failed to generate keyword-targeted blog article:', error);
        return buildFallbackBlogDraft(
            context.normalizedPrimaryKeyword,
            context.normalizedSupportingKeywords,
            location,
            businessName,
            industry,
        );
    }
}
