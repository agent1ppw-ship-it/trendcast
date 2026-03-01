import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Define the root directory for Contractor Hub SEO articles
const contentDir = path.join(process.cwd(), 'src/content/hub');

export interface HubArticle {
    slug: string;
    title: string;
    description: string;
    industry: string;
    date: string;
    keywords: string;
    content: string;
}

// Ensure the directory exists
function ensureDirectoryExists() {
    if (!fs.existsSync(contentDir)) {
        fs.mkdirSync(contentDir, { recursive: true });
    }
}

// Retrieve all markdown files and parse their metadata
export function getAllArticles(): HubArticle[] {
    ensureDirectoryExists();

    // Get file names under /src/content/hub
    const fileNames = fs.readdirSync(contentDir);
    const allArticlesData = fileNames
        .filter(fileName => fileName.endsWith('.md'))
        .map(fileName => {
            // Remove ".md" from file name to create slug
            const slug = fileName.replace(/\.md$/, '');

            // Read markdown file as string
            const fullPath = path.join(contentDir, fileName);
            const fileContents = fs.readFileSync(fullPath, 'utf8');

            // Use gray-matter to parse the post metadata section
            const matterResult = matter(fileContents);

            // Combine the data with the id
            return {
                slug,
                content: matterResult.content,
                ...(matterResult.data as { title: string; description: string; industry: string; date: string; keywords: string; }),
            };
        });

    // Sort posts by date
    return allArticlesData.sort((a, b) => {
        if (a.date < b.date) {
            return 1;
        } else {
            return -1;
        }
    });
}

// Retrieve a single article by its slug
export function getArticleBySlug(slug: string): HubArticle | null {
    try {
        const fullPath = path.join(contentDir, `${slug}.md`);
        const fileContents = fs.readFileSync(fullPath, 'utf8');

        // Use gray-matter to parse the post metadata section
        const matterResult = matter(fileContents);

        return {
            slug,
            content: matterResult.content,
            ...(matterResult.data as { title: string; description: string; industry: string; date: string; keywords: string; }),
        };
    } catch (error) {
        return null; // Return null if file not found
    }
}
