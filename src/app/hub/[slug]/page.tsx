import { getArticleBySlug, getAllArticles } from '@/lib/mdx';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { ArrowLeft, Share2, Calendar, Tag } from 'lucide-react';
import type { Metadata } from 'next';

// Generate static routes at build time for raw SEO speed
export async function generateStaticParams() {
    const articles = getAllArticles();
    return articles.map((article) => ({
        slug: article.slug,
    }));
}

// Dynamically inject the YAML metadata into the document <head>
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const article = getArticleBySlug(slug);

    if (!article) return { title: 'Not Found' };

    return {
        title: `${article.title} | TrendCast AI`,
        description: article.description,
        keywords: article.keywords, // This is crucial for the long-tail SEO ranking
        openGraph: {
            title: article.title,
            description: article.description,
            type: 'article',
            publishedTime: article.date,
        }
    };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const article = getArticleBySlug(slug);

    if (!article) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-[#050505] text-gray-200">
            <Navbar />

            <article className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative z-10">
                {/* Background Glows */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

                {/* Return to Hub */}
                <Link href="/hub" className="inline-flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-colors mb-10 group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Contractor Hub
                </Link>

                {/* Article Header */}
                <header className="mb-14">
                    <div className="flex flex-wrap gap-4 items-center text-sm text-gray-400 font-medium mb-6">
                        <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full uppercase tracking-widest text-[10px] font-bold">
                            <Tag className="w-3 h-3" /> {article.industry}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 shadow-sm">
                        {article.title}
                    </h1>

                    <p className="text-xl text-gray-400 font-light leading-relaxed max-w-3xl">
                        {article.description}
                    </p>

                    <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border border-white/20 shadow-lg">
                                <span className="font-bold text-white text-sm">TC</span>
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm">TrendCast Platform</p>
                                <p className="text-gray-500 text-xs">Home Service AI Specialists</p>
                            </div>
                        </div>
                        <button className="p-2 bg-[#111] hover:bg-white/10 border border-white/5 rounded-md text-gray-400 hover:text-white transition-colors shadow-sm">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Markdown Content rendering in a classic editorial style */}
                <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/80 bg-white px-6 py-8 sm:px-9 md:px-12 md:py-12 shadow-[0_12px_42px_rgba(0,0,0,0.35)]">
                    <div className="prose prose-slate prose-lg max-w-none font-[Georgia,Times_New_Roman,serif] prose-headings:font-semibold prose-headings:tracking-tight prose-headings:scroll-mt-28 prose-h2:mt-14 prose-h2:mb-5 prose-h3:mt-9 prose-h3:mb-4 prose-a:text-blue-700 prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-950 prose-p:my-5 prose-p:text-[1.08rem] prose-p:leading-8 prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-2 prose-li:text-slate-800 prose-blockquote:my-8 prose-blockquote:border-l-4 prose-blockquote:border-slate-400 prose-blockquote:bg-slate-50 prose-blockquote:px-5 prose-blockquote:py-2 prose-blockquote:rounded-r-lg prose-code:text-slate-900 prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-300 prose-pre:my-8 prose-img:rounded-xl prose-img:shadow-xl prose-img:my-8">
                        <ReactMarkdown>
                            {article.content}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Call to Action Wrapper */}
                <div className="mt-20 p-8 rounded-2xl bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/20 text-center shadow-[0_0_50px_rgba(59,130,246,0.1)] relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-400"></div>
                    <h3 className="text-2xl font-bold text-white mb-3">Ready to scale your {article.industry} pipeline?</h3>
                    <p className="text-gray-300 mb-8 max-w-xl mx-auto">
                        Stop buying shared leads. Connect your business to TrendCast and let our AI scrape, qualify, and route exclusive contracts directly to your CRM.
                    </p>
                    <Link href="/signup" className="inline-flex py-3 px-8 rounded-lg bg-white text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-all">
                        Start your 14-Day Free Trial
                    </Link>
                </div>
            </article>
        </div>
    );
}
