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
                <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Blog Posts</h1>
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
                    <Card className="border-white/5 bg-[#111] shadow-md">
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
                                    {draft.dataSource === 'AI_ESTIMATE' ? 'AI draft generation' : 'Template fallback draft'}
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
                                    <p>{draft.excerpt}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-[#161616] p-6 md:p-8">
                                <div className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-headings:tracking-tight prose-h2:mt-10 prose-h2:mb-4 prose-h3:mt-8 prose-h3:mb-3 prose-p:my-6 prose-p:indent-6 prose-p:leading-8 prose-strong:text-white prose-ul:my-7 prose-ul:pl-6 prose-ol:my-7 prose-ol:pl-6 prose-li:my-2 prose-li:text-gray-300 prose-p:text-gray-300 prose-img:my-8 prose-img:rounded-2xl prose-img:border prose-img:border-white/10 prose-img:shadow-lg">
                                    <ReactMarkdown>{draft.contentMarkdown}</ReactMarkdown>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
