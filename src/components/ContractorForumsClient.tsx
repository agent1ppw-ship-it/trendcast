'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Building2, MessageSquare, Plus, Search } from 'lucide-react';

type ForumCategory = 'DISCUSSION' | 'JOB' | 'PROMOTION';
type HeaderSize = 'SM' | 'MD' | 'LG';
type HeaderFont = 'SANS' | 'SERIF' | 'MONO';
type BodyFont = 'SANS' | 'SERIF' | 'MONO';
type BodySize = 'SM' | 'MD' | 'LG';
type LineSpacing = 'NORMAL' | 'RELAXED' | 'LOOSE';

interface ForumPostStyle {
    headerSize: HeaderSize;
    headerFont: HeaderFont;
    bodyFont: BodyFont;
    bodySize: BodySize;
    lineSpacing: LineSpacing;
}

interface ForumReply {
    id: string;
    authorName: string;
    body: string;
    createdAt: string;
}

interface ForumPost {
    id: string;
    category: ForumCategory;
    title: string;
    body: string;
    authorName: string;
    companyName?: string;
    location?: string;
    contactInfo?: string;
    style?: ForumPostStyle;
    createdAt: string;
    replies: ForumReply[];
}

const STORAGE_KEY = 'trendcast:contractor-forums:v1';
const DEFAULT_POST_STYLE: ForumPostStyle = {
    headerSize: 'MD',
    headerFont: 'SANS',
    bodyFont: 'SANS',
    bodySize: 'MD',
    lineSpacing: 'RELAXED',
};

const HEADER_SIZE_CLASS: Record<HeaderSize, string> = {
    SM: 'text-xl',
    MD: 'text-2xl',
    LG: 'text-3xl',
};

const BODY_SIZE_CLASS: Record<BodySize, string> = {
    SM: 'text-sm',
    MD: 'text-base',
    LG: 'text-lg',
};

const LINE_SPACING_CLASS: Record<LineSpacing, string> = {
    NORMAL: 'leading-6',
    RELAXED: 'leading-7',
    LOOSE: 'leading-8',
};

const FONT_FAMILY: Record<HeaderFont | BodyFont, string> = {
    SANS: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    SERIF: 'Georgia, Cambria, Times New Roman, Times, serif',
    MONO: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

function normalizeStyle(style?: ForumPostStyle): ForumPostStyle {
    if (!style) return DEFAULT_POST_STYLE;
    return {
        headerSize: style.headerSize || DEFAULT_POST_STYLE.headerSize,
        headerFont: style.headerFont || DEFAULT_POST_STYLE.headerFont,
        bodyFont: style.bodyFont || DEFAULT_POST_STYLE.bodyFont,
        bodySize: style.bodySize || DEFAULT_POST_STYLE.bodySize,
        lineSpacing: style.lineSpacing || DEFAULT_POST_STYLE.lineSpacing,
    };
}

const defaultPosts: ForumPost[] = [
    {
        id: 'p1',
        category: 'DISCUSSION',
        title: 'How are you using AI for missed-call text-back?',
        body: 'We connected missed calls to instant SMS follow-up and booked 6 extra estimates last month. Curious what copy and automation timing others are using.',
        authorName: 'Daniel R.',
        companyName: 'Apex Plumbing Co.',
        location: 'Chicago, IL',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        replies: [
            {
                id: 'r1',
                authorName: 'Megan T.',
                body: 'We send the first text in under 30 seconds and keep it one sentence + booking link. Conversion jumped after we removed long intros.',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            },
        ],
    },
    {
        id: 'p2',
        category: 'JOB',
        title: 'Hiring: Dispatch Coordinator (HVAC, remote)',
        body: 'Looking for a dispatcher familiar with CRM pipeline stages, estimate scheduling, and basic automation workflows.',
        authorName: 'Chris L.',
        companyName: 'Northline HVAC',
        location: 'Fort Wayne, IN',
        contactInfo: 'careers@northlinehvac.com',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
        replies: [],
    },
    {
        id: 'p3',
        category: 'PROMOTION',
        title: 'Before/After lead-to-mailer campaign results',
        body: 'We used targeted mailers after scraping local roofing leads and closed 9 jobs from 200 cards in 45 days.',
        authorName: 'Alicia P.',
        companyName: 'Peakline Roofing',
        location: 'Tampa, FL',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        replies: [],
    },
];

function categoryLabel(category: ForumCategory) {
    if (category === 'DISCUSSION') return 'AI Discussion';
    if (category === 'JOB') return 'Job Board';
    return 'Company Promotion';
}

function categoryClasses(category: ForumCategory) {
    if (category === 'DISCUSSION') return 'border-blue-300 bg-blue-50 text-blue-700';
    if (category === 'JOB') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    return 'border-amber-300 bg-amber-50 text-amber-700';
}

function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function ContractorForumsClient() {
    const [posts, setPosts] = useState<ForumPost[]>(defaultPosts);
    const [isHydrated, setIsHydrated] = useState(false);
    const [query, setQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'ALL' | ForumCategory>('ALL');
    const [showComposer, setShowComposer] = useState(false);
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    const [composer, setComposer] = useState({
        category: 'DISCUSSION' as ForumCategory,
        title: '',
        body: '',
        authorName: '',
        companyName: '',
        location: '',
        contactInfo: '',
        headerSize: DEFAULT_POST_STYLE.headerSize,
        headerFont: DEFAULT_POST_STYLE.headerFont,
        bodyFont: DEFAULT_POST_STYLE.bodyFont,
        bodySize: DEFAULT_POST_STYLE.bodySize,
        lineSpacing: DEFAULT_POST_STYLE.lineSpacing,
    });
    const [composerError, setComposerError] = useState('');

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                setIsHydrated(true);
                return;
            }
            const parsed = JSON.parse(raw) as ForumPost[];
            if (Array.isArray(parsed) && parsed.length) {
                setPosts(parsed);
            }
        } catch {
            // Keep defaults if local storage is malformed
        } finally {
            setIsHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    }, [isHydrated, posts]);

    const filteredPosts = useMemo(() => {
        const search = query.trim().toLowerCase();
        return posts
            .filter((post) => (categoryFilter === 'ALL' ? true : post.category === categoryFilter))
            .filter((post) => {
                if (!search) return true;
                const haystack = `${post.title} ${post.body} ${post.companyName || ''} ${post.location || ''}`.toLowerCase();
                return haystack.includes(search);
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [categoryFilter, posts, query]);

    const stats = useMemo(() => {
        return {
            totalThreads: posts.length,
            totalReplies: posts.reduce((sum, post) => sum + post.replies.length, 0),
            jobs: posts.filter((post) => post.category === 'JOB').length,
            promotions: posts.filter((post) => post.category === 'PROMOTION').length,
        };
    }, [posts]);

    const submitThread = () => {
        const title = composer.title.trim();
        const body = composer.body.trim();
        const authorName = composer.authorName.trim();
        if (!title || !body || !authorName) {
            setComposerError('Title, post body, and your name are required.');
            return;
        }

        const next: ForumPost = {
            id: `p-${Date.now()}`,
            category: composer.category,
            title,
            body,
            authorName,
            companyName: composer.companyName.trim() || undefined,
            location: composer.location.trim() || undefined,
            contactInfo: composer.contactInfo.trim() || undefined,
            style: {
                headerSize: composer.headerSize,
                headerFont: composer.headerFont,
                bodyFont: composer.bodyFont,
                bodySize: composer.bodySize,
                lineSpacing: composer.lineSpacing,
            },
            createdAt: new Date().toISOString(),
            replies: [],
        };

        setPosts((current) => [next, ...current]);
        setComposer({
            category: 'DISCUSSION',
            title: '',
            body: '',
            authorName: '',
            companyName: '',
            location: '',
            contactInfo: '',
            headerSize: DEFAULT_POST_STYLE.headerSize,
            headerFont: DEFAULT_POST_STYLE.headerFont,
            bodyFont: DEFAULT_POST_STYLE.bodyFont,
            bodySize: DEFAULT_POST_STYLE.bodySize,
            lineSpacing: DEFAULT_POST_STYLE.lineSpacing,
        });
        setComposerError('');
        setShowComposer(false);
    };

    const submitReply = (postId: string) => {
        const body = (replyDrafts[postId] || '').trim();
        if (!body) return;

        const reply: ForumReply = {
            id: `r-${Date.now()}`,
            authorName: 'Community Member',
            body,
            createdAt: new Date().toISOString(),
        };

        setPosts((current) =>
            current.map((post) =>
                post.id === postId
                    ? { ...post, replies: [...post.replies, reply] }
                    : post,
            ),
        );
        setReplyDrafts((current) => ({ ...current, [postId]: '' }));
    };

    return (
        <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
                        trendcast<span className="text-blue-700">.io</span>
                    </Link>
                    <Link
                        href="/signup?mode=signin"
                        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-all hover:bg-slate-50"
                    >
                        CRM Login
                    </Link>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
                <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
                    <div className="mb-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                        Contractor Forums
                    </div>
                    <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                        Discuss AI, post jobs, and promote your company
                    </h1>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
                        Share what is working in the field, hire faster, and connect with contractors building real AI workflows.
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Threads</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalThreads}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Replies</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.totalReplies}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Job Posts</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.jobs}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Promotions</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.promotions}</p>
                        </div>
                    </div>
                </section>

                <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search discussions, jobs, or promotions..."
                                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value as 'ALL' | ForumCategory)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                        >
                            <option value="ALL">All Posts</option>
                            <option value="DISCUSSION">AI Discussions</option>
                            <option value="JOB">Jobs</option>
                            <option value="PROMOTION">Company Promotions</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setShowComposer((value) => !value);
                            setComposerError('');
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" />
                        New Post
                    </button>
                </section>

                {showComposer && (
                    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="text-xl font-semibold text-slate-900">Create a new thread</h2>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Post Type</label>
                                <select
                                    value={composer.category}
                                    onChange={(event) =>
                                        setComposer((current) => ({ ...current, category: event.target.value as ForumCategory }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                >
                                    <option value="DISCUSSION">AI Discussion</option>
                                    <option value="JOB">Job Post</option>
                                    <option value="PROMOTION">Company Promotion</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Your Name</label>
                                <input
                                    value={composer.authorName}
                                    onChange={(event) => setComposer((current) => ({ ...current, authorName: event.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Title</label>
                            <input
                                value={composer.title}
                                onChange={(event) => setComposer((current) => ({ ...current, title: event.target.value }))}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Post Body</label>
                            <textarea
                                rows={5}
                                value={composer.body}
                                onChange={(event) => setComposer((current) => ({ ...current, body: event.target.value }))}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Company</label>
                                <input
                                    value={composer.companyName}
                                    onChange={(event) => setComposer((current) => ({ ...current, companyName: event.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Location</label>
                                <input
                                    value={composer.location}
                                    onChange={(event) => setComposer((current) => ({ ...current, location: event.target.value }))}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</label>
                                <input
                                    value={composer.contactInfo}
                                    onChange={(event) => setComposer((current) => ({ ...current, contactInfo: event.target.value }))}
                                    placeholder="Email or phone"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Post Formatting</p>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Header Size</label>
                                    <select
                                        value={composer.headerSize}
                                        onChange={(event) => setComposer((current) => ({ ...current, headerSize: event.target.value as HeaderSize }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="SM">Small</option>
                                        <option value="MD">Medium</option>
                                        <option value="LG">Large</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Header Font</label>
                                    <select
                                        value={composer.headerFont}
                                        onChange={(event) => setComposer((current) => ({ ...current, headerFont: event.target.value as HeaderFont }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="SANS">Sans Serif</option>
                                        <option value="SERIF">Serif</option>
                                        <option value="MONO">Monospace</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Body Font</label>
                                    <select
                                        value={composer.bodyFont}
                                        onChange={(event) => setComposer((current) => ({ ...current, bodyFont: event.target.value as BodyFont }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="SANS">Sans Serif</option>
                                        <option value="SERIF">Serif</option>
                                        <option value="MONO">Monospace</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Body Size</label>
                                    <select
                                        value={composer.bodySize}
                                        onChange={(event) => setComposer((current) => ({ ...current, bodySize: event.target.value as BodySize }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="SM">Small</option>
                                        <option value="MD">Medium</option>
                                        <option value="LG">Large</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Line Spacing</label>
                                    <select
                                        value={composer.lineSpacing}
                                        onChange={(event) => setComposer((current) => ({ ...current, lineSpacing: event.target.value as LineSpacing }))}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="NORMAL">Normal</option>
                                        <option value="RELAXED">Relaxed</option>
                                        <option value="LOOSE">Loose</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {composerError ? (
                            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                {composerError}
                            </p>
                        ) : null}

                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={submitThread}
                                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                            >
                                Publish Thread
                            </button>
                        </div>
                    </section>
                )}

                <section className="space-y-4">
                    {filteredPosts.map((post) => {
                        const postStyle = normalizeStyle(post.style);
                        return (
                        <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_14px_rgba(15,23,42,0.05)]">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${categoryClasses(post.category)}`}>
                                    {categoryLabel(post.category)}
                                </span>
                                <span className="text-xs text-slate-500">{timeAgo(post.createdAt)}</span>
                            </div>

                            <h3
                                className={`${HEADER_SIZE_CLASS[postStyle.headerSize]} font-semibold tracking-tight text-slate-900`}
                                style={{ fontFamily: FONT_FAMILY[postStyle.headerFont] }}
                            >
                                {post.title}
                            </h3>
                            <p
                                className={`mt-2 text-slate-700 ${BODY_SIZE_CLASS[postStyle.bodySize]} ${LINE_SPACING_CLASS[postStyle.lineSpacing]}`}
                                style={{ fontFamily: FONT_FAMILY[postStyle.bodyFont] }}
                            >
                                {post.body}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                <span className="inline-flex items-center gap-1">
                                    <MessageSquare className="h-4 w-4" />
                                    {post.replies.length} replies
                                </span>
                                {post.companyName ? (
                                    <span className="inline-flex items-center gap-1">
                                        <Building2 className="h-4 w-4" />
                                        {post.companyName}
                                    </span>
                                ) : null}
                                {post.category === 'JOB' ? (
                                    <span className="inline-flex items-center gap-1">
                                        <Briefcase className="h-4 w-4" />
                                        Hiring
                                    </span>
                                ) : null}
                                {post.location ? <span>{post.location}</span> : null}
                                {post.contactInfo ? <span>Contact: {post.contactInfo}</span> : null}
                                <span>Posted by {post.authorName}</span>
                            </div>

                            <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Discussion</p>
                                {post.replies.length === 0 ? (
                                    <p className="text-sm text-slate-500">No replies yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {post.replies.map((reply) => (
                                            <div key={reply.id} className="rounded-lg border border-slate-200 bg-white p-3">
                                                <p className="text-sm leading-6 text-slate-700">{reply.body}</p>
                                                <p className="mt-2 text-xs text-slate-500">
                                                    {reply.authorName} • {timeAgo(reply.createdAt)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        value={replyDrafts[post.id] || ''}
                                        onChange={(event) =>
                                            setReplyDrafts((current) => ({ ...current, [post.id]: event.target.value }))
                                        }
                                        placeholder="Add a reply..."
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => submitReply(post.id)}
                                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                    >
                                        Reply
                                    </button>
                                </div>
                            </div>
                        </article>
                        );
                    })}

                    {filteredPosts.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
                            No forum posts matched your filters.
                        </div>
                    ) : null}
                </section>
            </main>
        </div>
    );
}
