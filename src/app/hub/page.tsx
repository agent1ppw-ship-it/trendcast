import { getAllArticles } from '@/lib/mdx';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { ChevronRight, Filter } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contractor Hub | AI Tools for Home Services',
    description: 'Read the latest strategies, guides, and implementation case studies on how home service businesses are adopting AI lead scraping and voice agents.',
};

export default function HubIndexPage() {
    const articles = getAllArticles();

    return (
        <div className="min-h-screen bg-[#050505] text-gray-200 selection:bg-blue-500/30">
            <Navbar />

            <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
                {/* Background Glows */}
                <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
                <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

                <div className="mb-16">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-6 tracking-tight">
                        Contractor Hub
                    </h1>
                    <p className="text-xl text-gray-400 font-light max-w-2xl leading-relaxed">
                        The ultimate library of AI implementation guides for scaling your <span className="text-gray-200 font-medium tracking-wide">home service business</span>.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {articles.map((article) => (
                        <Link href={`/hub/${article.slug}`} key={article.slug} className="group flex">
                            <Card className="bg-[#111] border-white/5 hover:border-white/20 transition-all duration-300 w-full flex flex-col hover:-translate-y-1 shadow-lg overflow-hidden position-relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                <CardHeader>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 border border-blue-500/20 bg-blue-500/10 px-2 py-1 rounded-full">
                                            {article.industry}
                                        </span>
                                        <time className="text-xs text-gray-500 font-medium">
                                            {new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </time>
                                    </div>
                                    <CardTitle className="text-xl font-bold text-gray-100 group-hover:text-white transition-colors leading-tight">
                                        {article.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="flex-1 flex flex-col justify-between">
                                    <p className="text-sm text-gray-400 mb-6 line-clamp-3 leading-relaxed">
                                        {article.description}
                                    </p>
                                    <div className="flex items-center text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors mt-auto">
                                        Read Guide <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
