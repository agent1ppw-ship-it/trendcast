import { getArticleBySlug, getAllArticles } from '@/lib/mdx';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import type { Metadata } from 'next';
import { siteName, siteUrl } from '@/lib/site';

export async function generateStaticParams() {
    const articles = getAllArticles();
    return articles.map((article) => ({
        slug: article.slug,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const article = getArticleBySlug(slug);

    if (!article) return { title: 'Not Found' };

    return {
        title: article.title,
        description: article.description,
        keywords: [article.keywords, 'AI tools for home service businesses', 'home service marketing automation'],
        alternates: {
            canonical: `/blog/${slug}`,
        },
        openGraph: {
            title: article.title,
            description: article.description,
            type: 'article',
            publishedTime: article.date,
            url: `${siteUrl}/blog/${slug}`,
        },
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.description,
        },
    };
}

function stripLeadingH1(content: string) {
    return content.replace(/^#\s.+\n+/m, '').trim();
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);

    if (!article) {
        notFound();
    }

    const cleanContent = stripLeadingH1(article.content);
    const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.round(wordCount / 220));
    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.description,
        datePublished: article.date,
        dateModified: article.date,
        keywords: article.keywords,
        mainEntityOfPage: `${siteUrl}/blog/${article.slug}`,
        author: {
            '@type': 'Organization',
            name: siteName,
        },
        publisher: {
            '@type': 'Organization',
            name: siteName,
        },
    };

    return (
        <div className="min-h-screen bg-[#05070D] text-gray-100 selection:bg-cyan-500/25">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
            />
            <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070B12]/95 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
                    <Link href="/" className="text-lg font-semibold tracking-tight text-white">
                        trendcast<span className="text-cyan-300">.io</span>
                    </Link>
                    <Link
                        href="/blog"
                        className="inline-flex items-center rounded-full border border-white/15 bg-[#101827] px-4 py-2 text-sm font-medium text-gray-100 transition-all hover:bg-[#182131]"
                    >
                        Blog
                    </Link>
                </div>
            </header>

            <article className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
                <Link href="/blog" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Blog
                </Link>

                <header className="mb-8 border-b border-white/10 pb-7">
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 font-semibold uppercase tracking-[0.16em] text-cyan-200">
                            <Tag className="h-3 w-3" />
                            {article.industry}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span>{readMinutes} min read</span>
                    </div>

                    <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
                        {article.title}
                    </h1>
                    <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-300">
                        {article.description}
                    </p>
                    <p className="mt-5 text-sm text-gray-500">By TrendCast Editorial Team</p>
                </header>

                <div className="rounded-2xl border border-white/10 bg-[#0D121C] px-6 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.42)] sm:px-9 md:px-11">
                    <div className="keyword-blog-content prose prose-invert prose-lg max-w-none font-[Georgia,Times_New_Roman,serif] prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-16 prose-h2:mb-7 prose-h3:mt-12 prose-h3:mb-5 prose-p:my-8 prose-p:text-[1.08rem] prose-p:leading-[2.2] prose-ul:my-8 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-8 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-4 prose-li:leading-8 prose-strong:text-white prose-a:text-cyan-300 prose-a:no-underline hover:prose-a:underline prose-blockquote:my-10 prose-blockquote:border-l-4 prose-blockquote:border-cyan-300/40 prose-blockquote:bg-[#121A24] prose-blockquote:px-4 prose-blockquote:py-3 prose-code:bg-[#1B2230] prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                        <ReactMarkdown>
                            {cleanContent}
                        </ReactMarkdown>
                    </div>
                </div>

                <section className="mt-10 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-[#0A1322] to-[#0A0F19] px-6 py-6">
                    <h3 className="text-xl font-semibold text-white">Need this system implemented in your CRM?</h3>
                    <p className="mt-2 text-gray-300">
                        TrendCast helps home service teams deploy lead capture, qualification, and lead-to-mailer workflows without adding operational overhead.
                    </p>
                    <Link
                        href="/signup"
                        className="mt-4 inline-flex items-center rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-cyan-200"
                    >
                        Start Free
                    </Link>
                </section>
            </article>
        </div>
    );
}
