'use client';

import { useMemo, useState, useTransition } from 'react';
import { BarChart3, FileText, Gauge, Loader2, MapPin, Search, Sparkles, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateKeywordIdeas } from '@/app/actions/keywords';
import type { KeywordOpportunityReport } from '@/lib/ai/keywordOpportunities';

const industryOptions = [
    'Roofing',
    'HVAC',
    'Landscaping',
    'Plumbing',
    'Pressure Washing',
    'Electrical',
    'Concrete',
    'Pest Control',
];

function sanitizeIndustry(industry: string) {
    return industry.trim() || 'Roofing';
}

export function KeywordOpportunityClient({
    defaultIndustry,
}: {
    defaultIndustry: string;
}) {
    const [industry, setIndustry] = useState(sanitizeIndustry(defaultIndustry));
    const [location, setLocation] = useState('Chicago, IL');
    const [report, setReport] = useState<KeywordOpportunityReport | null>(null);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    const availableIndustries = useMemo(() => {
        const normalizedDefault = sanitizeIndustry(defaultIndustry);
        return industryOptions.includes(normalizedDefault)
            ? industryOptions
            : [normalizedDefault, ...industryOptions];
    }, [defaultIndustry]);

    const lowCompetitionCount = report?.keywords.filter((keyword) => keyword.competitionOutlook === 'LOW').length || 0;
    const highIntentCount = report?.keywords.filter((keyword) => keyword.buyerIntent === 'HIGH').length || 0;
    const averageOpportunityScore = report?.keywords.length
        ? Math.round(report.keywords.reduce((sum, keyword) => sum + keyword.opportunityScore, 0) / report.keywords.length)
        : 0;

    const handleGenerate = () => {
        setError('');

        startTransition(async () => {
            const result = await generateKeywordIdeas(industry, location);

            if (!result.success || !result.report) {
                setReport(null);
                setError(result.error || 'Failed to generate keyword opportunities.');
                return;
            }

            setReport(result.report);
        });
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-8 text-gray-100">
            <div className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                    <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Keyword Opportunities (Beta)</h1>
                    <p className="font-light leading-7 text-gray-400">
                        Generate localized long-tail keyword ideas for a target industry and service area. This version
                        prioritizes commercial-intent phrases and directional opportunity scoring for fast SEO planning.
                    </p>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-white/5 bg-[#111] shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-400">
                            Keyword Set
                            <Search className="h-4 w-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{report?.keywords.length || 0}</div>
                        <p className="mt-1 text-xs text-gray-500">Localized long-tail ideas generated</p>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-[#111] shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-400">
                            Low Competition
                            <Target className="h-4 w-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{lowCompetitionCount}</div>
                        <p className="mt-1 text-xs text-gray-500">Directional low-competition opportunities</p>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-[#111] shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-400">
                            High Buyer Intent
                            <Gauge className="h-4 w-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{highIntentCount}</div>
                        <p className="mt-1 text-xs text-gray-500">Phrases suited for direct service acquisition</p>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-[#111] shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-sm font-medium text-gray-400">
                            Avg Opportunity
                            <BarChart3 className="h-4 w-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{averageOpportunityScore}</div>
                        <p className="mt-1 text-xs text-gray-500">Directional score across the generated set</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
                <Card className="border-white/5 bg-[#111] shadow-md">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                            <Sparkles className="h-4 w-4 text-blue-400" />
                            Search Controls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Industry</label>
                            <select
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-4 py-2.5 text-white transition-all focus:border-blue-500/50 focus:outline-none"
                            >
                                {availableIndustries.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">ZIP Or City</label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Chicago, IL or 60614"
                                className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-4 py-2.5 text-white transition-all focus:border-blue-500/50 focus:outline-none"
                            />
                        </div>

                        <div className="rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">Data Status</p>
                            <p className="text-sm leading-6 text-gray-300">
                                This tool currently generates localized opportunities with AI-assisted scoring. It does not yet
                                pull live keyword volume, CPC, or verified competition from a paid SEO provider.
                            </p>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        {report && (
                            <div className="rounded-xl border border-white/5 bg-[#161616] px-4 py-4">
                                <p className="text-sm leading-6 text-gray-300">{report.summary}</p>
                                <p className="mt-3 text-xs text-gray-500">{report.disclaimer}</p>
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={isPending}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-500 disabled:opacity-60"
                        >
                            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                            {isPending ? 'Generating Keywords...' : 'Generate Keyword Opportunities'}
                        </button>
                    </CardContent>
                </Card>

                <Card className="min-w-0 border-white/5 bg-[#111] shadow-md">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-lg font-semibold text-white">Long-Tail Opportunities</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="border-b border-white/5 bg-[#161616] text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-4 font-medium tracking-wider">Keyword</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Intent</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Competition</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Opportunity</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Best Asset</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {!report && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <div className="mx-auto max-w-md">
                                                <p className="mb-2 text-base text-gray-300">No keyword set generated yet.</p>
                                                <p className="text-sm text-gray-500">
                                                    Choose an industry and service area, then generate a localized long-tail keyword list.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {report?.keywords.map((keyword) => (
                                    <tr key={keyword.keyword} className="align-top transition-colors hover:bg-[#161616]">
                                        <td className="px-6 py-5">
                                            <div className="font-semibold text-gray-100">{keyword.keyword}</div>
                                            <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
                                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                <span>{report.location}</span>
                                            </div>
                                            <p className="mt-3 max-w-xl leading-6 text-gray-400">{keyword.rationale}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={keyword.buyerIntent === 'HIGH'
                                                ? 'inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300'
                                                : 'inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300'}>
                                                {keyword.buyerIntent}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={keyword.competitionOutlook === 'LOW'
                                                ? 'inline-flex rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300'
                                                : keyword.competitionOutlook === 'MEDIUM'
                                                    ? 'inline-flex rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-300'
                                                    : 'inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-300'}>
                                                {keyword.competitionOutlook}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-mono text-gray-200">{keyword.opportunityScore}/100</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="inline-flex items-center gap-2 text-gray-300">
                                                <FileText className="h-4 w-4 text-gray-500" />
                                                {keyword.suggestedAsset}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
