import OpenAI from 'openai';

// Assuming the API key is provided in the environment variables
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-key-for-build',
});

interface ArticleData {
    title: string;
    slug: string;
    excerpt: string;
    contentMarkdown: string;
    seoKeywords: string[];
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
    3. The main content in Markdown format (at least 600 words) using headings (H2, H3), bullet points, and localized references if possible.
    4. A list of exactly 5 long-tail SEO keywords.

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
