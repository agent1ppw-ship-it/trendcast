'use client';

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from 'react';
import { FileText, Loader2, MapPin, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { KeywordTargetedBlogDraft } from '@/lib/ai/articleGenerator';
import { generateKeywordBlogDraft } from '@/app/actions/keywords';
import { clearLatestBlogDraft, loadLatestBlogDraft, markBlogDraftAsViewed, saveLatestBlogDraft, subscribeToBlogDraftInbox } from '@/lib/blogDraftInbox';

type ContentBlock =
    | { type: 'h2'; text: string }
    | { type: 'h3'; text: string }
    | { type: 'p'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'ol'; items: string[] }
    | { type: 'quote'; text: string };

function normalizeText(value: string) {
    return value.replace(/\s+/g, ' ').trim();
}

function stripHeavyIndentation(markdown: string) {
    const source = markdown || '';
    const lines = source.split('\n');
    const nonEmpty = lines.filter((line) => line.trim().length > 0);
    if (nonEmpty.length === 0) return source;

    const indentedCount = nonEmpty.filter((line) => /^ {4,}\S/.test(line)).length;
    if (indentedCount / nonEmpty.length < 0.6) return source;

    return lines.map((line) => line.replace(/^ {4}/, '')).join('\n');
}

function parseMarkdownBlocks(markdown: string): ContentBlock[] {
    const source = stripHeavyIndentation(markdown).replace(/\r\n/g, '\n');
    const lines = source.split('\n');
    const blocks: ContentBlock[] = [];
    let paragraphLines: string[] = [];
    let bulletItems: string[] = [];
    let numberedItems: string[] = [];

    const flushParagraph = () => {
        const text = normalizeText(paragraphLines.join(' '));
        if (text) blocks.push({ type: 'p', text });
        paragraphLines = [];
    };

    const flushBullets = () => {
        if (bulletItems.length > 0) blocks.push({ type: 'ul', items: bulletItems });
        bulletItems = [];
    };

    const flushNumbers = () => {
        if (numberedItems.length > 0) blocks.push({ type: 'ol', items: numberedItems });
        numberedItems = [];
    };

    const flushAll = () => {
        flushParagraph();
        flushBullets();
        flushNumbers();
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const trimmed = line.trim();

        if (!trimmed) {
            flushAll();
            continue;
        }

        if (/^!\[[^\]]*]\([^)]+\)$/.test(trimmed)) {
            continue;
        }

        const h2Match = trimmed.match(/^##\s+(.+)$/);
        if (h2Match) {
            flushAll();
            blocks.push({ type: 'h2', text: normalizeText(h2Match[1]) });
            continue;
        }

        const h3Match = trimmed.match(/^###\s+(.+)$/);
        if (h3Match) {
            flushAll();
            blocks.push({ type: 'h3', text: normalizeText(h3Match[1]) });
            continue;
        }

        const quoteMatch = trimmed.match(/^>\s+(.+)$/);
        if (quoteMatch) {
            flushAll();
            blocks.push({ type: 'quote', text: normalizeText(quoteMatch[1]) });
            continue;
        }

        const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
            flushParagraph();
            flushNumbers();
            const value = normalizeText(bulletMatch[1]);
            if (value) bulletItems.push(value);
            continue;
        }

        const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
        if (numberedMatch) {
            flushParagraph();
            flushBullets();
            const value = normalizeText(numberedMatch[1]);
            if (value) numberedItems.push(value);
            continue;
        }

        flushBullets();
        flushNumbers();
        paragraphLines.push(trimmed);
    }

    flushAll();
    return blocks;
}

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
    const contentBlocks = useMemo(
        () => parseMarkdownBlocks(draft?.contentMarkdown || ''),
        [draft?.contentMarkdown],
    );

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
        <section className="min-h-screen bg-[#04070D] px-4 py-8 text-gray-100 md:px-8">
            <div className="mb-10">
                <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">Blog Posts (Beta)</h1>
                <p className="font-light text-gray-400">
                    Review the latest keyword-targeted blog draft generated from Keyword Opportunities.
                </p>
            </div>

            {!draft && (
                <Card className="border-white/10 bg-[#0D121C] shadow-md">
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
                    <Card className="min-w-0 border-white/10 bg-[#0D121C] shadow-md">
                        <CardHeader className="border-b border-white/10 pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                                <Sparkles className="h-4 w-4 text-cyan-300" />
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
                                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
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
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition-all hover:bg-cyan-500/20 disabled:opacity-50"
                                >
                                    {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    {isRegenerating ? 'Regenerating...' : 'Regenerate Draft'}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition-all hover:bg-red-500/20"
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

                    <Card className="border-white/10 bg-[#0D121C] shadow-md">
                        <CardHeader className="border-b border-white/10 pb-4">
                            <CardTitle className="text-3xl font-bold tracking-tight text-white">{draft.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="rounded-2xl border border-cyan-400/20 bg-[#0A1322] p-5">
                                <div className="flex items-start gap-2 text-sm text-gray-300">
                                    <MapPin className="mt-1 h-4 w-4 shrink-0 text-gray-500" />
                                    <p className="max-w-3xl leading-8">{draft.excerpt}</p>
                                </div>
                            </div>

                            <div className="keyword-blog-content min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#09101A] px-5 py-6 md:px-8">
                                {contentBlocks.length === 0 && (
                                    <p className="text-gray-400">No readable content found in this draft.</p>
                                )}

                                {contentBlocks.map((block, index) => {
                                    if (block.type === 'h2') {
                                        return (
                                            <h3 key={`h2-${index}`} className="mt-10 mb-4 text-3xl font-semibold tracking-tight text-white first:mt-0">
                                                {block.text}
                                            </h3>
                                        );
                                    }

                                    if (block.type === 'h3') {
                                        return (
                                            <h4 key={`h3-${index}`} className="mt-8 mb-3 text-2xl font-semibold tracking-tight text-gray-100">
                                                {block.text}
                                            </h4>
                                        );
                                    }

                                    if (block.type === 'ul') {
                                        return (
                                            <ul key={`ul-${index}`} className="my-5 list-disc space-y-2 pl-6 text-[1.08rem] leading-9 text-gray-100">
                                                {block.items.map((item, itemIndex) => (
                                                    <li key={`ul-${index}-${itemIndex}`}>{item}</li>
                                                ))}
                                            </ul>
                                        );
                                    }

                                    if (block.type === 'ol') {
                                        return (
                                            <ol key={`ol-${index}`} className="my-5 list-decimal space-y-2 pl-6 text-[1.08rem] leading-9 text-gray-100">
                                                {block.items.map((item, itemIndex) => (
                                                    <li key={`ol-${index}-${itemIndex}`}>{item}</li>
                                                ))}
                                            </ol>
                                        );
                                    }

                                    if (block.type === 'quote') {
                                        return (
                                            <blockquote key={`q-${index}`} className="my-6 rounded-r-xl border-l-4 border-cyan-300/40 bg-[#121A24] px-4 py-3 text-[1.02rem] leading-8 text-gray-100">
                                                {block.text}
                                            </blockquote>
                                        );
                                    }

                                    return (
                                        <p key={`p-${index}`} className="my-5 text-[1.08rem] leading-9 text-gray-100">
                                            {block.text}
                                        </p>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </section>
    );
}
