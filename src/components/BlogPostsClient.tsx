'use client';

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Loader2, MapPin, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { KeywordTargetedBlogDraft } from '@/lib/ai/articleGenerator';
import { generateKeywordBlogDraft } from '@/app/actions/keywords';
import { clearLatestBlogDraft, loadLatestBlogDraft, markBlogDraftAsViewed, saveLatestBlogDraft, subscribeToBlogDraftInbox } from '@/lib/blogDraftInbox';

export function BlogPostsClient() {
    const draft = useSyncExternalStore(
        subscribeToBlogDraftInbox,
        loadLatestBlogDraft,
        (): KeywordTargetedBlogDraft | null => null,
    );
    const [error, setError] = useState('');
    const [isRegenerating, startRegenerating] = useTransition();

    useEffect(() => {
        markBlogDraftAsViewed();
    }, []);

    const canRegenerate = Boolean(draft?.industry && draft?.location && draft?.primaryKeyword);

    const handleDelete = () => {
        setError('');
        clearLatestBlogDraft();
    };

    const handleRegenerate = () => {
        if (!draft) return;
        if (!canRegenerate) {
            setError('This draft is missing its original keyword metadata. Generate a fresh draft from Keyword Opportunities first.');
            return;
        }

        setError('');

        startRegenerating(async () => {
            const result = await generateKeywordBlogDraft(
                draft.industry,
                draft.location,
                [draft.primaryKeyword, ...draft.supportingKeywords].filter(Boolean).slice(0, 5),
                `regenerate-${Date.now()}`,
                {
                    title: draft.title,
                    excerpt: draft.excerpt,
                    contentMarkdown: draft.contentMarkdown,
                },
            );

            if (!result.success || !result.draft) {
                setError(result.error || 'Failed to regenerate blog draft.');
                return;
            }

            saveLatestBlogDraft(result.draft);
            markBlogDraftAsViewed();
        });
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-8 text-gray-100">
            <div className="mb-10">
                <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Blog Posts (Beta)</h1>
                <p className="font-light text-gray-400">
                    Review the latest keyword-targeted blog draft generated from the Keyword Opportunities tool.
                </p>
            </div>

            {!draft && (
                <Card className="border-white/5 bg-[#111] shadow-md">
                    <CardContent className="px-8 py-20 text-center">
                        <div className="mx-auto max-w-md">
                            <p className="mb-2 text-base text-gray-300">No generated blog draft yet.</p>
                            <p className="text-sm text-gray-500">
                                Generate a draft from the Keyword Opportunities page and it will appear here automatically.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {draft && (
                <div className="grid grid-cols-1 gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <Card className="min-w-0 border-white/5 bg-[#111] shadow-md">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                                <Sparkles className="h-4 w-4 text-blue-400" />
                                Draft Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Primary Keyword</div>
                                <div className="mt-2 text-lg font-semibold text-white">{draft.primaryKeyword}</div>
                            </div>

                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Supporting Keywords</div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {draft.supportingKeywords.length === 0 && (
                                        <span className="text-sm text-gray-500">No supporting keywords were used.</span>
                                    )}
                                    {draft.supportingKeywords.map((keyword) => (
                                        <span key={keyword} className="rounded-full border border-white/10 bg-[#161616] px-3 py-1 text-xs text-gray-300">
                                            {keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Slug</div>
                                <div className="mt-2 font-mono text-sm text-gray-300">{draft.slug}</div>
                            </div>

                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Industry / Location</div>
                                <div className="mt-2 text-sm text-gray-300">
                                    {draft.industry || 'Unknown industry'}{draft.location ? ` / ${draft.location}` : ''}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Source</div>
                                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-300">
                                    <FileText className="h-3.5 w-3.5" />
                                    {draft.generatorVersion === 'legacy' ? 'Legacy Draft' : 'LLM Beta'}
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                    Generator Version: {draft.generatorVersion}
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={handleRegenerate}
                                    disabled={isRegenerating || !canRegenerate}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-600/10 px-4 py-2.5 text-sm font-medium text-blue-300 transition-all hover:bg-blue-600/20 disabled:opacity-50"
                                >
                                    {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    {isRegenerating ? 'Regenerating...' : 'Regenerate Draft'}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-all hover:bg-red-500/20"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Draft
                                </button>
                            </div>

                            {error && (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    {error}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-white/5 bg-[#111] shadow-md">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="text-3xl font-bold tracking-tight text-white">{draft.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/10 to-transparent p-5">
                                <div className="flex items-start gap-2 text-sm text-gray-300">
                                    <MapPin className="mt-1 h-4 w-4 shrink-0 text-gray-500" />
                                    <p className="max-w-3xl leading-8">{draft.excerpt}</p>
                                </div>
                            </div>

                            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 md:p-10 shadow-[0_8px_28px_rgba(0,0,0,0.18)]">
                                <div className="prose prose-slate prose-lg mx-auto w-full max-w-3xl break-words font-[Georgia,Times_New_Roman,serif] prose-headings:break-words prose-headings:font-semibold prose-headings:text-slate-900 prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-5 prose-h3:mt-8 prose-h3:mb-4 prose-p:my-5 prose-p:text-[1.08rem] prose-p:leading-8 prose-strong:text-slate-950 prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-2 prose-li:text-slate-800 prose-blockquote:border-l-4 prose-blockquote:border-slate-400 prose-blockquote:bg-slate-50 prose-blockquote:px-4 prose-blockquote:py-2 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                                    <ReactMarkdown components={{ img: () => null }}>{draft.contentMarkdown}</ReactMarkdown>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
