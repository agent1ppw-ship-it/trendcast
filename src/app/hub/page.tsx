import { getAllArticles } from '@/lib/mdx';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contractor Hub | AI Tools for Home Services',
    description: 'Read the latest strategies, guides, and implementation case studies on how home service businesses are adopting AI lead scraping and voice agents.',
};

export default function HubIndexPage() {
    const articles = getAllArticles();

    return (
        <div className="min-h-screen bg-[#f6f6f3] text-slate-900 selection:bg-blue-100">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
                    <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
                        trendcast<span className="text-blue-700">.io</span>
                    </Link>
                    <Link
                        href="/signup"
                        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-all hover:bg-slate-50"
                    >
                        CRM Login
                    </Link>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-12 sm:px-6">
                <section className="mb-10 border-b border-slate-200 pb-8">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Resources</p>
                    <h1 className="mb-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                        Home Service AI Playbooks
                    </h1>
                    <p className="max-w-3xl text-lg leading-8 text-slate-700">
                        Practical implementation guides written in a clean editorial format. Every article focuses on direct AI deployments for home service operators.
                    </p>
                </section>

                <section className="space-y-5">
                    {articles.map((article) => {
                        const wordCount = article.content.split(/\s+/).filter(Boolean).length;
                        const readMinutes = Math.max(1, Math.round(wordCount / 220));

                        return (
                            <article
                                key={article.slug}
                                className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-[0_2px_14px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_26px_rgba(15,23,42,0.09)] sm:px-7"
                            >
                                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold uppercase tracking-[0.16em] text-blue-700">
                                        {article.industry}
                                    </span>
                                    <span>{new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span>{readMinutes} min read</span>
                                </div>
                                <h2 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900">
                                    <Link href={`/hub/${article.slug}`} className="hover:text-blue-700">
                                        {article.title}
                                    </Link>
                                </h2>
                                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
                                    {article.description}
                                </p>
                                <div className="mt-4">
                                    <Link
                                        href={`/hub/${article.slug}`}
                                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
                                    >
                                        Read article <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </article>
                        );
                    })}

                    {articles.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-500">
                            No articles published yet.
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
