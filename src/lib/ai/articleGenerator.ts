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
    dataSource: 'AI_ESTIMATE' | 'TEMPLATE_FALLBACK';
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function buildImagePlaceholder(label: string) {
    const encodedLabel = encodeURIComponent(label.replace(/\s+/g, ' ').trim());
    return `![${label}](https://placehold.co/1200x675/111827/F3F4F6?text=${encodedLabel})`;
}

function buildFallbackBlogDraft(
    primaryKeyword: string,
    supportingKeywords: string[],
    location: string,
    businessName: string,
    industry: string,
): KeywordTargetedBlogDraft {
    const title = `${primaryKeyword.replace(/\b\w/g, (char) => char.toUpperCase())}: What ${location} Customers Should Know`;
    const excerpt = `${businessName} created this localized guide to help readers understand ${primaryKeyword} in ${location}. The post targets high-intent local search while staying practical and informative.`;
    const allKeywords = [primaryKeyword, ...supportingKeywords].slice(0, 5);
    const slug = slugify(`${primaryKeyword} ${location}`);

    const contentMarkdown = `
${buildImagePlaceholder(`${industry} service in ${location}`)}

## Why ${primaryKeyword.replace(/\b\w/g, (char) => char.toUpperCase())} Matters In ${location}

When people search for **${primaryKeyword}**, they are usually close to hiring someone. They are trying to solve a real property problem in ${location}, and they want a contractor who understands the local service environment.

For ${industry} companies, that creates a strong SEO opportunity. A focused page can answer the exact problem, explain the service clearly, and show why a local provider is the right fit.

## What Customers Usually Need

Readers searching this phrase often want:

- A contractor who already handles this exact service
- Clear expectations on scope, timing, and pricing factors
- Confidence that the provider works in ${location}
- Proof that the contractor understands related issues, such as ${supportingKeywords[0] || `${industry.toLowerCase()} maintenance`} and ${supportingKeywords[1] || `${industry.toLowerCase()} repair`}

${buildImagePlaceholder(`${industry} project details for ${location}`)}

## How To Make The Page Useful

The blog post should not read like keyword stuffing. It should explain:

1. What the service includes
2. When a customer should call
3. What affects cost or timeline
4. What a qualified contractor should inspect first
5. How the work connects to nearby services or maintenance needs

## Related Search Topics To Cover Naturally

To expand the SEO footprint without sounding forced, this draft also supports:

${allKeywords.map((keyword) => `- ${keyword}`).join('\n')}

Each of these should be worked into the article only where they genuinely help the reader.

## Why Local Readers Convert On Pages Like This

Local SEO content performs best when it answers the exact service question quickly. It should show what the service includes, who it is for, and what makes a qualified contractor worth contacting.

Short paragraphs and clear headings matter here. Readers should be able to scan the article and find the main answer without digging through a wall of text.

${buildImagePlaceholder(`${businessName} serving ${location}`)}

## Call To Action

Strong local SEO content should make it easy for the visitor to take the next step. That means ending with a clear, direct invitation to contact **${businessName}** for help with **${primaryKeyword}** in **${location}**.

The call to action should stay natural. It should sound like a recommendation from a knowledgeable local provider, not a hard sell.

## Final Takeaway

If your goal is to rank for **${primaryKeyword}**, the content should focus on clarity, local relevance, and buyer intent. That is what turns a long-tail keyword into actual pipeline activity instead of just page traffic.
`.trim();

    return {
        title,
        slug,
        excerpt,
        contentMarkdown,
        seoKeywords: allKeywords,
        primaryKeyword,
        supportingKeywords,
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
    4. Include a markdown image placeholder roughly every 300 words using this exact style:
       ![Descriptive alt text](https://placehold.co/1200x675/111827/F3F4F6?text=YOUR+IMAGE+LABEL)
    5. The page title will be rendered as the H1 outside the markdown body, so do not repeat the H1 inside contentMarkdown.
    6. A list of exactly 5 long-tail SEO keywords.

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

        const parsedData = JSON.parse(responseContent) as ArticleData;
        return parsedData;

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
    if (!process.env.OPENAI_API_KEY) {
        return buildFallbackBlogDraft(primaryKeyword, supportingKeywords, location, businessName, industry);
    }

    const prompt = `
You are an expert local SEO copywriter for home service companies.

Write a long-form blog draft that primarily targets this keyword:
- Primary keyword: ${primaryKeyword}

Supporting keywords to weave in naturally:
${supportingKeywords.map((keyword) => `- ${keyword}`).join('\n') || '- none'}

Business:
- Company name: ${businessName}
- Industry: ${industry}
- Service area: ${location}

Requirements:
1. The article must feel natural, informative, and genuinely useful for a local reader.
2. Do not keyword-stuff. Use the supporting keywords only where they fit naturally.
3. Write at least 900 words.
4. Use markdown with proper blog formatting:
   - H2 and H3 subheadings
   - short paragraphs of 2 to 4 sentences
   - bullet points where useful
   - no dense text walls
5. Make the primary keyword a clear SEO target in the title, excerpt, and early body copy.
6. The tone should be educational first and sales-oriented second.
7. Insert a markdown image placeholder roughly every 300 words using this exact format:
   ![Descriptive alt text](https://placehold.co/1200x675/111827/F3F4F6?text=YOUR+IMAGE+LABEL)
8. The page title will be rendered as the H1 outside the markdown body, so do not repeat the H1 inside contentMarkdown.
9. End with a local CTA that naturally positions ${businessName} as a provider in ${location}.

Return valid JSON only:
{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "contentMarkdown": "string",
  "seoKeywords": ["string"]
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
        if (!responseContent) {
            return buildFallbackBlogDraft(primaryKeyword, supportingKeywords, location, businessName, industry);
        }

        const parsedData = JSON.parse(responseContent) as ArticleData;

        return {
            title: parsedData.title,
            slug: parsedData.slug || slugify(`${primaryKeyword} ${location}`),
            excerpt: parsedData.excerpt,
            contentMarkdown: parsedData.contentMarkdown,
            seoKeywords: parsedData.seoKeywords?.length
                ? parsedData.seoKeywords.slice(0, 5)
                : [primaryKeyword, ...supportingKeywords].slice(0, 5),
            primaryKeyword,
            supportingKeywords,
            dataSource: 'AI_ESTIMATE',
        };
    } catch (error) {
        console.error('Failed to generate keyword-targeted blog article:', error);
        return buildFallbackBlogDraft(primaryKeyword, supportingKeywords, location, businessName, industry);
    }
}
