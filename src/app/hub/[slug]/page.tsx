import { getArticleBySlug, getAllArticles } from '@/lib/mdx';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import type { Metadata } from 'next';

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
        title: `${article.title} | TrendCast Resources`,
        description: article.description,
        keywords: article.keywords,
        openGraph: {
            title: article.title,
            description: article.description,
            type: 'article',
            publishedTime: article.date,
        },
    };
}

function stripLeadingH1(content: string) {
    return content.replace(/^#\s.+\n+/m, '').trim();
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);

    if (!article) {
        notFound();
    }

    const cleanContent = stripLeadingH1(article.content);
    const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.round(wordCount / 220));

    return (
        <div className="min-h-screen bg-[#f6f6f3] text-slate-900 selection:bg-blue-100">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
                    <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
                        trendcast<span className="text-blue-700">.io</span>
                    </Link>
                    <Link
                        href="/hub"
                        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-all hover:bg-slate-50"
                    >
                        All Resources
                    </Link>
                </div>
            </header>

            <article className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
                <Link href="/hub" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Resources
                </Link>

                <header className="mb-8 border-b border-slate-200 pb-7">
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-semibold uppercase tracking-[0.16em] text-blue-700">
                            <Tag className="h-3 w-3" />
                            {article.industry}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span>{readMinutes} min read</span>
                    </div>

                    <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
                        {article.title}
                    </h1>
                    <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
                        {article.description}
                    </p>
                    <p className="mt-5 text-sm text-slate-500">By TrendCast Editorial Team</p>
                </header>

                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-[0_3px_18px_rgba(15,23,42,0.06)] sm:px-9 md:px-11">
                    <div className="prose prose-slate prose-lg max-w-none font-[Georgia,Times_New_Roman,serif] prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-16 prose-h2:mb-7 prose-h3:mt-12 prose-h3:mb-5 prose-p:my-8 prose-p:text-[1.08rem] prose-p:leading-[2.2] prose-ul:my-8 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-8 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-4 prose-li:leading-8 prose-li:text-slate-800 prose-strong:text-slate-950 prose-a:text-blue-700 prose-a:no-underline hover:prose-a:underline prose-blockquote:my-10 prose-blockquote:border-l-4 prose-blockquote:border-slate-400 prose-blockquote:bg-slate-50 prose-blockquote:px-4 prose-blockquote:py-3 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                        <ReactMarkdown>
                            {cleanContent}
                        </ReactMarkdown>
                    </div>
                </div>

                <section className="mt-10 rounded-2xl border border-blue-200 bg-blue-50 px-6 py-6">
                    <h3 className="text-xl font-semibold text-slate-900">Need this system implemented in your CRM?</h3>
                    <p className="mt-2 text-slate-700">
                        TrendCast helps home service teams deploy lead capture, qualification, and lead-to-mailer workflows without adding operational overhead.
                    </p>
                    <Link
                        href="/signup"
                        className="mt-4 inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                    >
                        Start Free
                    </Link>
                </section>
            </article>
        </div>
    );
}
