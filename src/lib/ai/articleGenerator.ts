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
    dataSource: 'AI_ESTIMATE' | 'TEMPLATE_FALLBACK';
}

interface PreviousDraftContext {
    title: string;
    excerpt: string;
    contentMarkdown: string;
}

const FALLBACK_INTRO_VARIANTS = [
    'A strong contractor should explain the work in plain language before talking about upgrades or add-ons.',
    'The most useful draft starts by clarifying the job itself, not by jumping straight into promotional language.',
    'Good service content should help a customer understand the project before they ever compare bids.',
];

const FALLBACK_CTA_VARIANTS = [
    'The next step should be a site review and a practical conversation about what fits the property.',
    'A contractor should be able to walk through the property, explain realistic options, and narrow the scope before quoting.',
    'The right provider should help turn the idea into a workable plan, not just hand over a generic estimate.',
];

interface KeywordContext {
    normalizedPrimaryKeyword: string;
    normalizedSupportingKeywords: string[];
    serviceFocus: string;
    serviceTopic: string;
    readerIntent: string;
    readerQuestions: string[];
    localAngle: string;
}

interface FocusAngle {
    titleSuffix: string;
    sectionHeading: string;
    description: string;
    promptInstruction: string;
    fallbackQuestions: string[];
}

interface OutlineArchetype {
    name: string;
    openingHeading: string;
    openingInstruction: string;
    sectionHeadings: [string, string, string];
    sectionInstructions: [string, string, string];
    ctaInstruction: string;
}

const REGENERATION_ANGLES: FocusAngle[] = [
    {
        titleSuffix: 'Planning Considerations',
        sectionHeading: 'How To Plan The Project Correctly',
        description: 'planning decisions, site evaluation, layout, scope definition, and prep work before the project begins',
        promptInstruction: 'Make planning and early project decisions the main angle for this version.',
        fallbackQuestions: [
            'What should be evaluated on the property before the plan is finalized?',
            'Which planning decisions are hardest to change later?',
            'What should be clarified before the scope is approved?',
        ],
    },
    {
        titleSuffix: 'Cost And Scope Factors',
        sectionHeading: 'What Actually Affects Cost And Scope',
        description: 'pricing drivers, scope risk, labor complexity, and how customers should compare proposals',
        promptInstruction: 'Make cost, scope, and proposal comparison the main angle for this version.',
        fallbackQuestions: [
            'Which site conditions usually change the price the most?',
            'What details should be included in a serious quote?',
            'How can a customer tell the difference between a complete scope and an incomplete one?',
        ],
    },
    {
        titleSuffix: 'Common Mistakes To Avoid',
        sectionHeading: 'Mistakes That Cause Problems Later',
        description: 'avoidable mistakes, shortcuts, poor planning, and contractor-selection errors that create rework',
        promptInstruction: 'Make avoidable mistakes and how to prevent them the main angle for this version.',
        fallbackQuestions: [
            'What decisions commonly create avoidable rework later?',
            'Which shortcuts usually cause the biggest quality problems?',
            'What should a customer verify before work starts?',
        ],
    },
    {
        titleSuffix: 'Material And Durability Decisions',
        sectionHeading: 'Material Choices And Long-Term Performance',
        description: 'material tradeoffs, long-term durability, upkeep, and choosing options that fit the property',
        promptInstruction: 'Make materials, durability, and long-term performance the main angle for this version.',
        fallbackQuestions: [
            'Which material decisions affect longevity the most?',
            'How do maintenance expectations change between options?',
            'What should a customer ask about long-term performance?',
        ],
    },
    {
        titleSuffix: 'Questions To Ask Before Hiring',
        sectionHeading: 'What To Ask Before Choosing A Contractor',
        description: 'contractor selection, proposal review, communication, and how to judge qualifications before hiring',
        promptInstruction: 'Make hiring decisions and contractor evaluation the main angle for this version.',
        fallbackQuestions: [
            'What should a customer ask to confirm the contractor understands the work?',
            'How should a customer compare two different proposals?',
            'What communication or process details matter before work begins?',
        ],
    },
];

const ARTICLE_ARCHETYPES: OutlineArchetype[] = [
    {
        name: 'Decision Guide',
        openingHeading: 'What This Service Actually Solves',
        openingInstruction: 'Open by explaining the real property or operational problem the service is meant to solve.',
        sectionHeadings: ['How The Work Is Usually Scoped', 'What Changes The Outcome', 'How To Compare Providers'],
        sectionInstructions: [
            'Explain how professionals scope the work and what should be clarified early.',
            'Explain which project conditions, materials, or site constraints affect the result most.',
            'Explain how a customer should compare proposals or providers without relying on generic advice.',
        ],
        ctaInstruction: 'End with a calm, practical CTA based on next steps and project fit.',
    },
    {
        name: 'Mistake Prevention',
        openingHeading: 'Where Projects Usually Go Wrong',
        openingInstruction: 'Open with the mistakes, blind spots, or bad assumptions that commonly create problems later.',
        sectionHeadings: ['What Should Be Decided Early', 'What Customers Often Overlook', 'How To Avoid Rework'],
        sectionInstructions: [
            'Explain the early choices that are hardest to reverse later.',
            'Explain the site conditions, scope details, or communication issues customers often miss.',
            'Explain how the customer can reduce risk before work starts.',
        ],
        ctaInstruction: 'End by recommending a site review or planning conversation before committing to the work.',
    },
    {
        name: 'Owner Checklist',
        openingHeading: 'What To Review Before Moving Forward',
        openingInstruction: 'Open with a checklist-style framing that helps the customer understand what should be reviewed before committing.',
        sectionHeadings: ['What Should Be In The Proposal', 'Questions Worth Asking', 'What A Solid Plan Looks Like'],
        sectionInstructions: [
            'Break down what a credible proposal or scope should include.',
            'Give practical questions that expose weak planning or vague estimates.',
            'Describe what a well-scoped, well-communicated plan looks like in practice.',
        ],
        ctaInstruction: 'End by inviting the reader to use the checklist in a conversation with a local contractor.',
    },
    {
        name: 'Scope Breakdown',
        openingHeading: 'What Is Usually Included In The Work',
        openingInstruction: 'Open by breaking the service into its major parts instead of starting with generic context.',
        sectionHeadings: ['What A Contractor Should Evaluate', 'What Affects Timeline And Budget', 'What Matters After The Work Is Done'],
        sectionInstructions: [
            'Explain what should be inspected or evaluated before recommendations are made.',
            'Explain what drives timeline changes, pricing, and project complexity.',
            'Explain what affects long-term performance, maintenance, or follow-up decisions.',
        ],
        ctaInstruction: 'End by positioning the business as a provider that can explain the scope clearly before quoting.',
    },
    {
        name: 'Planning Primer',
        openingHeading: 'How To Plan The Job The Right Way',
        openingInstruction: 'Open with the planning lens and explain why early decisions shape the final result.',
        sectionHeadings: ['What Needs To Be Clarified First', 'Which Choices Matter Most', 'How To Know The Plan Is Ready'],
        sectionInstructions: [
            'Explain the first questions that should be answered before design or pricing goes too far.',
            'Explain which choices have the biggest effect on quality, maintenance, or total scope.',
            'Explain how a customer can tell the project is properly defined before approving it.',
        ],
        ctaInstruction: 'End with a CTA that emphasizes clarity, scope review, and practical next steps.',
    },
];

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

function toTitleCase(value: string) {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function createStableSeed(value: string) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }

    return hash;
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

function buildReadableProjectLabel(context: KeywordContext, industry: string) {
    const industryTokens = normalizeKeyword(industry).toLowerCase().split(/\s+/).filter(Boolean);
    const serviceLabel = buildReadableServiceLabel(context, industry)
        .replace(/\b(contractor|contractors|company|companies|expert|experts)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const serviceTokens = serviceLabel.split(/\s+/).filter(Boolean);
    const nonIndustryTokens = serviceTokens.filter((token) => !industryTokens.includes(token));

    const compactLabel = nonIndustryTokens.length >= 2
        ? nonIndustryTokens.join(' ')
        : serviceLabel;

    if (serviceLabel.endsWith('work') || serviceLabel.endsWith('service') || serviceLabel.endsWith('project')) {
        return compactLabel;
    }

    if (compactLabel.includes('design') || compactLabel.includes('installation') || compactLabel.includes('repair')) {
        return `${compactLabel} project`.trim();
    }

    return `${compactLabel} work`.trim();
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

function pickVariant<T>(variants: T[], seed: number) {
    if (variants.length === 0) {
        throw new Error('pickVariant requires at least one variant.');
    }

    return variants[seed % variants.length];
}

function selectFocusAngle(context: KeywordContext, regenerationSeed?: string) {
    const seed = createStableSeed([
        context.normalizedPrimaryKeyword,
        context.normalizedSupportingKeywords.join('|'),
        regenerationSeed || 'initial-draft',
    ].join('|'));

    return {
        seed,
        angle: pickVariant(REGENERATION_ANGLES, seed),
    };
}

function selectOutlineArchetype(context: KeywordContext, regenerationSeed?: string) {
    const seed = createStableSeed([
        'outline',
        context.normalizedPrimaryKeyword,
        context.normalizedSupportingKeywords.join('|'),
        regenerationSeed || 'initial-draft',
    ].join('|'));

    return {
        seed,
        archetype: pickVariant(ARTICLE_ARCHETYPES, seed),
    };
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

function buildFallbackBlogDraft(
    primaryKeyword: string,
    supportingKeywords: string[],
    location: string,
    businessName: string,
    industry: string,
    regenerationSeed?: string,
    previousDraft?: PreviousDraftContext,
): KeywordTargetedBlogDraft {
    const context = buildKeywordContext(primaryKeyword, supportingKeywords, industry, location);
    const { seed: fallbackSeed, angle } = selectFocusAngle(context, regenerationSeed);
    const { archetype } = selectOutlineArchetype(context, regenerationSeed);
    const readableServiceLabel = buildReadableServiceLabel(context, industry);
    const readableProjectLabel = buildReadableProjectLabel(context, industry);
    const title = `${toTitleCase(context.normalizedPrimaryKeyword)}: ${angle.titleSuffix} For ${location}`;
    const excerpt = `${businessName} created this guide to help property owners understand ${readableServiceLabel} in ${location}, with a focus on ${angle.description}.`;
    const allKeywords = [context.normalizedPrimaryKeyword, ...context.normalizedSupportingKeywords].slice(0, 5);
    const slug = slugify(`${context.normalizedPrimaryKeyword} ${location}`);
    const primaryRelatedTopic = context.normalizedSupportingKeywords[0] || `${industry.toLowerCase()} material selection`;
    const secondaryRelatedTopic = context.normalizedSupportingKeywords[1] || `${industry.toLowerCase()} project planning`;
    const freshnessLine = previousDraft
        ? `For customers in ${location}, this article focuses on ${angle.description}.`
        : pickVariant(FALLBACK_INTRO_VARIANTS, fallbackSeed);

    const contentMarkdown = `
## ${archetype.openingHeading}

A ${readableProjectLabel} project usually starts with a site review, a discussion of how the space will be used, and a plan for how the finished work should function day to day. A good contractor should be able to explain layout, materials, drainage, access, and how the work fits the property instead of jumping straight to a price.

For customers in ${location}, the early planning stage matters because small decisions at the beginning often determine how well the project holds up later. The right plan should balance appearance, durability, maintenance needs, and how the finished work connects to the rest of the property. ${freshnessLine}

## ${archetype.sectionHeadings[0]}

Most customers should bring in a contractor once they know the problem they are trying to solve with the space. That might mean creating a better area for entertaining, improving traffic flow, replacing a worn-out feature, or making part of the property easier to maintain.

A contractor is most useful when they can help define scope before money is wasted on the wrong design or material choice. This is especially true when grading, drainage, access, structural support, or long-term maintenance will affect the outcome. ${archetype.sectionInstructions[0]}

## ${archetype.sectionHeadings[1]}

    A useful proposal should explain more than the visual design. It should show how the work will function once it is built and what conditions on the property could change the plan. In this case, the most useful focus is ${angle.description}. ${archetype.sectionInstructions[1]}

- The intended use of the space and how much traffic it will handle
- Material options and what they mean for maintenance, lifespan, and appearance
- Drainage, grading, and any site-prep work needed before installation
- Timeline, crew access, and how the work may affect the rest of the property
- What is included in the quoted scope and what would count as a change order

## ${archetype.sectionHeadings[2]}

Customers usually get better results when they ask direct questions before the project starts. A contractor should be able to explain the reasoning behind the plan, not just hand over a sketch and a price. ${archetype.sectionInstructions[2]}

1. ${angle.fallbackQuestions[0]}
2. ${angle.fallbackQuestions[1]}
3. ${angle.fallbackQuestions[2]}
4. How does this project connect to related needs such as ${primaryRelatedTopic} or ${secondaryRelatedTopic}?
5. What is included in the quoted scope, and what is not?

## What Property Owners In ${location} Should Know

Local conditions affect how well a project performs over time. A design that looks good on paper may still fail if it does not account for water movement, freeze-thaw stress, heavy use, or the way the space connects to existing features on the property.

That is why the most useful contractor conversations are practical, not promotional. Customers should come away understanding what the work involves, what tradeoffs exist, and what decisions matter most before construction begins.

## Call To Action

If you are comparing options for **${context.normalizedPrimaryKeyword}** in **${location}**, the next step is to talk with a contractor who can explain the project clearly and tailor the plan to the property. **${businessName}** should be positioned as a provider that can review the site, explain realistic options, and help you move forward with a plan that makes sense. ${archetype.ctaInstruction} ${pickVariant(FALLBACK_CTA_VARIANTS, fallbackSeed + 1)}
`.trim();

    return {
        title,
        slug,
        excerpt,
        contentMarkdown,
        seoKeywords: allKeywords,
        primaryKeyword: context.normalizedPrimaryKeyword,
        supportingKeywords: context.normalizedSupportingKeywords,
        location,
        industry,
        dataSource: 'TEMPLATE_FALLBACK',
    };
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
    const { angle } = selectFocusAngle(context, regenerationSeed);
    const { archetype } = selectOutlineArchetype(context, regenerationSeed);

    if (!process.env.OPENAI_API_KEY) {
        return buildFallbackBlogDraft(
            context.normalizedPrimaryKeyword,
            context.normalizedSupportingKeywords,
            location,
            businessName,
            industry,
            regenerationSeed,
            previousDraft,
        );
    }

    const prompt = `
You are an expert local SEO copywriter for home service companies.

Write a long-form blog draft for this primary topic:
- Primary topic: ${context.normalizedPrimaryKeyword}

Related topics that may be used only if they genuinely improve the article:
${context.normalizedSupportingKeywords.map((keyword) => `- ${keyword}`).join('\n') || '- none'}

Business:
- Company name: ${businessName}
- Industry: ${industry}
- Service area: ${location}

Context for the article:
- Core service focus: ${context.serviceFocus}
- Likely customer need: ${context.readerIntent}
- Local angle: ${context.localAngle}
- Fresh angle for this version: ${angle.description}
- Outline archetype for this version: ${archetype.name}
- Questions that should be answered:
${context.readerQuestions.map((question) => `  - ${question}`).join('\n')}
- Regeneration hint: ${regenerationSeed || 'initial-draft'}
${previousDraft ? `- Previous draft title to avoid repeating: ${previousDraft.title}\n- Previous draft excerpt to avoid repeating: ${previousDraft.excerpt}` : ''}

Requirements:
1. The article must be genuinely useful to a property owner or property decision-maker.
2. Prioritize practical explanation, clear service guidance, and complete thoughts over keyword coverage.
3. Do not talk about "the search," "the query," "reader intent," SEO, or keywords inside the article body.
4. Do not write headings like "What People Usually Mean When They Search..." or "The Reader Intent Behind This Search."
5. Open by explaining the service itself, what it includes, and why it matters in practical terms.
6. Explain service scope, planning factors, pricing drivers, common mistakes, and how to evaluate a contractor where relevant.
7. Use related topics only when they improve the explanation. If they do not fit naturally, leave them out.
8. Avoid filler, vague statements, and generic marketing language.
9. Write at least 900 words.
10. Use markdown with proper blog formatting:
   - H2 and H3 subheadings
   - short paragraphs of 2 to 4 sentences
   - bullet points where useful
   - no dense text walls
11. Make the primary topic clear in the title, excerpt, and early body copy, but keep the prose natural.
12. Keep the tone educational first and sales-oriented second.
13. Do not include images, markdown image tags, or placeholder image URLs anywhere in the content.
14. The page title will be rendered as the H1 outside the markdown body, so do not repeat the H1 inside contentMarkdown.
15. End with a local CTA that naturally positions ${businessName} as a provider in ${location}.
16. If this is a regeneration request, produce a meaningfully fresh draft with different section phrasing, examples, and transitions while keeping the same topic and usefulness level.
17. ${angle.promptInstruction}
18. Do not simply paraphrase the prior article. Make the fresh angle drive the structure and examples.
19. Keep the keyword set relevant, but let the new angle determine the article's central topic.
20. Use this structure family for the article:
   - Opening heading: ${archetype.openingHeading}
   - Opening goal: ${archetype.openingInstruction}
   - Mid-section headings should follow this family:
     - ${archetype.sectionHeadings[0]}: ${archetype.sectionInstructions[0]}
     - ${archetype.sectionHeadings[1]}: ${archetype.sectionInstructions[1]}
     - ${archetype.sectionHeadings[2]}: ${archetype.sectionInstructions[2]}
   - CTA goal: ${archetype.ctaInstruction}
21. Do not reuse the same canned headings across drafts unless they are the best fit. Let the archetype drive the structure for this version.
22. Never use stock lead-ins such as:
   - "What People Usually Mean When They Search..."
   - "The Reader Intent Behind This Search"
   - "When people search for..."
   - "In this case, the real topic is..."
   - "This search usually signals..."

Quality bar:
- The article should still be useful if all related topics were removed.
- Every section should answer a real customer question or explain a real project consideration.
- The piece should read like a service guide, not an SEO exercise.
- The new version should feel like a different article, not a rewrite of the same outline.
- The outline should feel intentional and specific to this version, not like a default template reused every time.

Return valid JSON only:
{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "contentMarkdown": "string",
  "seoKeywords": ["string"]
}
`;

    const fallbackTitle = `${toTitleCase(context.normalizedPrimaryKeyword)}: ${angle.titleSuffix} For ${location}`;
    const fallbackSlug = slugify(`${context.normalizedPrimaryKeyword} ${location}`);
    const fallbackExcerpt = `${businessName} explains what local customers should know about ${buildReadableServiceLabel(context, industry)} in ${location}, with a focus on ${angle.description}.`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You write practical, high-conviction local service articles that help real customers make better decisions. You never force keywords or meta SEO phrasing at the expense of clarity.',
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
                regenerationSeed,
                previousDraft,
            );
        }

        const parsedData = sanitizeArticleData(
            JSON.parse(responseContent) as ArticleData,
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
            regenerationSeed,
            previousDraft,
        );
    }
}
