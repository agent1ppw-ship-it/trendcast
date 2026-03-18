import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, Sparkles } from 'lucide-react';
import { getAllArticles } from '@/lib/mdx';

export const metadata: Metadata = {
    title: 'Blog | Trendcast.io',
    description: 'Browse every Trendcast article on AI tools, lead scraping, local SEO, CRM workflows, and automation for home service industries.',
};

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function BlogPage() {
    const articles = getAllArticles();
    const featuredArticle = articles[0] || null;

    return (
        <div className="min-h-screen bg-[#04070b] text-gray-100">
            <section className="relative overflow-hidden border-b border-white/5 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_38%),radial-gradient(circle_at_75%_25%,rgba(74,222,128,0.12),transparent_30%),linear-gradient(180deg,#07111a_0%,#04070b_65%)]">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-overlay" />
                <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-24 lg:pt-28">
                    <div className="max-w-4xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            Trendcast Blog
                        </div>
                        <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                            AI playbooks for every home service workflow we support.
                        </h1>
                        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-300">
                            Browse strategy articles, industry guides, and automation breakdowns for contractors, trades, and local service operators. Every article here is sourced directly from the content files in your repo.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-300">
                            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                                {articles.length} published articles
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                                AI tools, lead scraping, SEO, and CRM workflows
                            </div>
                        </div>
                    </div>

                    {featuredArticle && (
                        <div className="mt-12 rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(13,20,31,0.95),rgba(8,14,22,0.92))] p-6 shadow-[0_0_60px_rgba(34,211,238,0.08)] lg:p-8">
                            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
                                    Featured
                                </span>
                                <span>{featuredArticle.industry}</span>
                                <span>{formatDate(featuredArticle.date)}</span>
                            </div>

                            <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-white">
                                {featuredArticle.title}
                            </h2>
                            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300">
                                {featuredArticle.description}
                            </p>
                            <Link
                                href={`/blog/${featuredArticle.slug}`}
                                className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-5 py-3 text-sm font-bold text-black transition-all hover:bg-cyan-200"
                            >
                                Read featured article
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white sm:text-3xl">All Articles</h2>
                        <p className="mt-2 text-sm text-gray-400">
                            Every article in `src/content/hub` appears here automatically.
                        </p>
                    </div>
                    <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 md:inline-flex">
                        <BookOpen className="h-4 w-4 text-cyan-300" />
                        Sorted by publish date
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {articles.map((article) => (
                        <Link
                            key={article.slug}
                            href={`/blog/${article.slug}`}
                            className="group rounded-3xl border border-white/8 bg-[linear-gradient(160deg,rgba(13,19,28,0.96),rgba(8,11,18,0.94))] p-6 transition-all hover:-translate-y-1 hover:border-cyan-300/30 hover:shadow-[0_16px_50px_rgba(34,211,238,0.08)]"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="rounded-full border border-blue-400/15 bg-blue-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200">
                                    {article.industry}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {formatDate(article.date)}
                                </span>
                            </div>

                            <h3 className="mt-5 text-2xl font-bold leading-tight text-white transition-colors group-hover:text-cyan-200">
                                {article.title}
                            </h3>
                            <p className="mt-4 text-sm leading-7 text-gray-400">
                                {article.description}
                            </p>

                            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition-colors group-hover:text-cyan-200">
                                Read article
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
