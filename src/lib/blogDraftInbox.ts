import type { KeywordTargetedBlogDraft } from '@/lib/ai/articleGenerator';

const BLOG_DRAFT_STORAGE_KEY = 'trendcast:latest-blog-draft';
const BLOG_DRAFT_UNREAD_KEY = 'trendcast:latest-blog-draft-unread';
export const BLOG_DRAFT_UPDATED_EVENT = 'trendcast:blog-draft-updated';

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStorage(key: string) {
    if (!canUseStorage()) return null;

    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string) {
    if (!canUseStorage()) return;

    try {
        window.localStorage.setItem(key, value);
    } catch {
        // Ignore storage write failures so the UI does not hard-crash.
    }
}

function normalizeStoredDraft(value: unknown): KeywordTargetedBlogDraft | null {
    if (!value || typeof value !== 'object') return null;

    const candidate = value as Partial<KeywordTargetedBlogDraft> & {
        title?: unknown;
        slug?: unknown;
        excerpt?: unknown;
        contentMarkdown?: unknown;
        seoKeywords?: unknown;
        primaryKeyword?: unknown;
        supportingKeywords?: unknown;
        dataSource?: unknown;
    };

    if (
        typeof candidate.title !== 'string' ||
        typeof candidate.slug !== 'string' ||
        typeof candidate.excerpt !== 'string' ||
        typeof candidate.contentMarkdown !== 'string'
    ) {
        return null;
    }

    const seoKeywords = Array.isArray(candidate.seoKeywords)
        ? candidate.seoKeywords.filter((keyword): keyword is string => typeof keyword === 'string')
        : [];
    const primaryKeyword = typeof candidate.primaryKeyword === 'string'
        ? candidate.primaryKeyword
        : seoKeywords[0] || '';
    const supportingKeywords = Array.isArray(candidate.supportingKeywords)
        ? candidate.supportingKeywords.filter((keyword): keyword is string => typeof keyword === 'string')
        : seoKeywords.filter((keyword) => keyword !== primaryKeyword).slice(0, 4);

    return {
        title: candidate.title,
        slug: candidate.slug,
        excerpt: candidate.excerpt,
        contentMarkdown: candidate.contentMarkdown,
        seoKeywords,
        primaryKeyword,
        supportingKeywords,
        dataSource: candidate.dataSource === 'TEMPLATE_FALLBACK' ? 'TEMPLATE_FALLBACK' : 'AI_ESTIMATE',
    };
}

export function saveLatestBlogDraft(draft: KeywordTargetedBlogDraft) {
    writeStorage(BLOG_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    writeStorage(BLOG_DRAFT_UNREAD_KEY, 'true');
    window.dispatchEvent(new Event(BLOG_DRAFT_UPDATED_EVENT));
}

export function loadLatestBlogDraft(): KeywordTargetedBlogDraft | null {
    const rawDraft = readStorage(BLOG_DRAFT_STORAGE_KEY);
    if (!rawDraft) return null;

    try {
        return normalizeStoredDraft(JSON.parse(rawDraft));
    } catch {
        return null;
    }
}

export function hasUnreadBlogDraft() {
    return readStorage(BLOG_DRAFT_UNREAD_KEY) === 'true';
}

export function markBlogDraftAsViewed() {
    writeStorage(BLOG_DRAFT_UNREAD_KEY, 'false');
    window.dispatchEvent(new Event(BLOG_DRAFT_UPDATED_EVENT));
}

export function subscribeToBlogDraftInbox(callback: () => void) {
    if (!canUseStorage()) {
        return () => undefined;
    }

    const handleChange = () => callback();
    window.addEventListener('storage', handleChange);
    window.addEventListener(BLOG_DRAFT_UPDATED_EVENT, handleChange);

    return () => {
        window.removeEventListener('storage', handleChange);
        window.removeEventListener(BLOG_DRAFT_UPDATED_EVENT, handleChange);
    };
}
