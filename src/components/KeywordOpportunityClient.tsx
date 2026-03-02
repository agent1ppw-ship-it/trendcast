'use client';

import { useMemo, useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowDown, ArrowUp, BarChart3, CheckSquare, FileText, Gauge, Loader2, MapPin, Search, Sparkles, Square, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateKeywordBlogDraft, generateKeywordIdeas } from '@/app/actions/keywords';
import type { KeywordTargetedBlogDraft } from '@/lib/ai/articleGenerator';
import { saveLatestBlogDraft } from '@/lib/blogDraftInbox';
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
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
    const [blogDraft, setBlogDraft] = useState<KeywordTargetedBlogDraft | null>(null);
    const [error, setError] = useState('');
    const [blogError, setBlogError] = useState('');
    const [isPending, startTransition] = useTransition();
    const [isDraftPending, startDraftTransition] = useTransition();

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
            setSelectedKeywords([]);
            setBlogDraft(null);
            setBlogError('');
        });
    };

    const toggleKeywordSelection = (keyword: string) => {
        setBlogError('');

        setSelectedKeywords((current) => {
            if (current.includes(keyword)) {
                return current.filter((entry) => entry !== keyword);
            }

            if (current.length >= 5) {
                setBlogError('You can select up to 5 keywords for one blog draft.');
                return current;
            }

            return [...current, keyword];
        });
    };

    const handleGenerateDraft = () => {
        if (selectedKeywords.length === 0) {
            setBlogError('Select at least one keyword to generate a blog draft.');
            return;
        }

        setBlogError('');

        startDraftTransition(async () => {
            const result = await generateKeywordBlogDraft(industry, location, selectedKeywords);

            if (!result.success || !result.draft) {
                setBlogDraft(null);
                setBlogError(result.error || 'Failed to generate blog draft.');
                return;
            }

            setBlogDraft(result.draft);
            saveLatestBlogDraft(result.draft);
        });
    };

    const moveSelectedKeyword = (keyword: string, direction: 'up' | 'down') => {
        setBlogError('');

        setSelectedKeywords((current) => {
            const index = current.indexOf(keyword);
            if (index === -1) return current;

            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= current.length) return current;

            const next = [...current];
            [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
            return next;
        });
    };

    const makePrimaryKeyword = (keyword: string) => {
        setBlogError('');

        setSelectedKeywords((current) => {
            const index = current.indexOf(keyword);
            if (index <= 0) return current;

            const next = [...current];
            next.splice(index, 1);
            next.unshift(keyword);
            return next;
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

                <div className="grid min-w-0 grid-cols-1 gap-8">
                    <Card className="min-w-0 border-white/5 bg-[#111] shadow-md">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <CardTitle className="text-lg font-semibold text-white">Long-Tail Opportunities</CardTitle>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="rounded-full border border-white/10 bg-[#161616] px-3 py-1 text-xs font-medium text-gray-400">
                                        {selectedKeywords.length}/5 selected
                                    </span>
                                    <button
                                        onClick={handleGenerateDraft}
                                        disabled={isDraftPending || selectedKeywords.length === 0}
                                        className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-600/10 px-4 py-2 text-sm font-medium text-blue-300 transition-all hover:bg-blue-600/20 disabled:opacity-50"
                                    >
                                        {isDraftPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                        {isDraftPending ? 'Generating Draft...' : blogDraft ? 'Regenerate Draft' : 'Import To Blog Generator'}
                                    </button>
                                </div>
                            </div>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="border-b border-white/5 bg-[#161616] text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-6 py-4 font-medium tracking-wider">Select</th>
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
                                            <td colSpan={6} className="px-6 py-16 text-center">
                                                <div className="mx-auto max-w-md">
                                                    <p className="mb-2 text-base text-gray-300">No keyword set generated yet.</p>
                                                    <p className="text-sm text-gray-500">
                                                        Choose an industry and service area, then generate a localized long-tail keyword list.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {report?.keywords.map((keyword) => {
                                        const isSelected = selectedKeywords.includes(keyword.keyword);
                                        const isSelectionLocked = !isSelected && selectedKeywords.length >= 5;

                                        return (
                                            <tr
                                                key={keyword.keyword}
                                                onClick={() => {
                                                    if (!isSelectionLocked) {
                                                        toggleKeywordSelection(keyword.keyword);
                                                    }
                                                }}
                                                className={isSelectionLocked
                                                    ? 'align-top transition-colors'
                                                    : 'align-top cursor-pointer transition-colors hover:bg-[#161616]'}
                                            >
                                                <td className="px-6 py-5">
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            toggleKeywordSelection(keyword.keyword);
                                                        }}
                                                        disabled={isSelectionLocked}
                                                        className="inline-flex items-center justify-center text-gray-300 disabled:opacity-40"
                                                        aria-label={isSelected ? 'Deselect keyword' : 'Select keyword'}
                                                    >
                                                        {isSelected ? <CheckSquare className="h-5 w-5 text-blue-400" /> : <Square className="h-5 w-5" />}
                                                    </button>
                                                </td>
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
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="border-white/5 bg-[#111] shadow-md">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="text-lg font-semibold text-white">Blog Draft Generator</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            <div className="rounded-xl border border-white/5 bg-[#161616] px-4 py-4">
                                <p className="text-sm leading-6 text-gray-300">
                                    Select up to 5 keywords above. The first selected keyword becomes the primary SEO target,
                                    and the remaining keywords are woven in naturally as supporting terms.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {selectedKeywords.length === 0 && (
                                    <span className="text-sm text-gray-500">No keywords selected yet.</span>
                                )}
                                {selectedKeywords.map((keyword, index) => (
                                    <div
                                        key={keyword}
                                        className={index === 0
                                            ? 'flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-600/10 px-4 py-3 md:flex-row md:items-center md:justify-between'
                                            : 'flex flex-col gap-3 rounded-xl border border-white/10 bg-[#161616] px-4 py-3 md:flex-row md:items-center md:justify-between'}
                                    >
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                                                {index === 0 ? 'Primary Keyword' : `Supporting Keyword ${index}`}
                                            </div>
                                            <div className={index === 0 ? 'mt-1 font-semibold text-blue-200' : 'mt-1 font-semibold text-gray-200'}>
                                                {keyword}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {index !== 0 && (
                                                <button
                                                    onClick={() => makePrimaryKeyword(keyword)}
                                                    className="rounded-lg border border-blue-500/20 bg-blue-600/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition-all hover:bg-blue-600/20"
                                                >
                                                    Make Primary
                                                </button>
                                            )}
                                            <button
                                                onClick={() => moveSelectedKeyword(keyword, 'up')}
                                                disabled={index === 0}
                                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#111] px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:bg-[#1A1A1A] disabled:opacity-40"
                                            >
                                                <ArrowUp className="h-3.5 w-3.5" />
                                                Up
                                            </button>
                                            <button
                                                onClick={() => moveSelectedKeyword(keyword, 'down')}
                                                disabled={index === selectedKeywords.length - 1}
                                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#111] px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:bg-[#1A1A1A] disabled:opacity-40"
                                            >
                                                <ArrowDown className="h-3.5 w-3.5" />
                                                Down
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {blogError && (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    {blogError}
                                </div>
                            )}

                            {blogDraft && (
                                <div className="space-y-5">
                                    <div className="rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/10 to-transparent p-5">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">Draft Summary</p>
                                        <h1 className="text-center text-3xl font-bold tracking-tight text-white">{blogDraft.title}</h1>
                                        <p className="mx-auto mt-3 max-w-3xl text-center leading-8 text-gray-300">{blogDraft.excerpt}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {blogDraft.seoKeywords.map((keyword) => (
                                                <span key={keyword} className="rounded-full border border-white/10 bg-[#111]/80 px-3 py-1 text-xs text-gray-300">
                                                    {keyword}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="mt-4 text-xs text-gray-500">
                                            Source: {blogDraft.dataSource === 'AI_ESTIMATE' ? 'AI draft generation' : 'Template fallback draft'}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/5 bg-[#161616] p-6 md:p-8">
                                        <div className="prose prose-invert prose-lg mx-auto max-w-3xl text-center prose-headings:text-center prose-headings:text-white prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-6 prose-h3:mt-10 prose-h3:mb-5 prose-p:my-8 prose-p:leading-[2] prose-strong:text-white prose-ul:my-10 prose-ul:list-none prose-ul:pl-0 prose-ol:my-10 prose-ol:pl-0 prose-li:my-5 prose-li:text-gray-300 prose-p:text-gray-300">
                                            <ReactMarkdown components={{ img: () => null }}>{blogDraft.contentMarkdown}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
