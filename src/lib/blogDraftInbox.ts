import type { KeywordTargetedBlogDraft } from '@/lib/ai/articleGenerator';

const BLOG_DRAFT_STORAGE_KEY = 'trendcast:latest-blog-draft';
const BLOG_DRAFT_UNREAD_KEY = 'trendcast:latest-blog-draft-unread';
export const BLOG_DRAFT_UPDATED_EVENT = 'trendcast:blog-draft-updated';

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function saveLatestBlogDraft(draft: KeywordTargetedBlogDraft) {
    if (!canUseStorage()) return;

    window.localStorage.setItem(BLOG_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    window.localStorage.setItem(BLOG_DRAFT_UNREAD_KEY, 'true');
    window.dispatchEvent(new Event(BLOG_DRAFT_UPDATED_EVENT));
}

export function loadLatestBlogDraft(): KeywordTargetedBlogDraft | null {
    if (!canUseStorage()) return null;

    const rawDraft = window.localStorage.getItem(BLOG_DRAFT_STORAGE_KEY);
    if (!rawDraft) return null;

    try {
        return JSON.parse(rawDraft) as KeywordTargetedBlogDraft;
    } catch {
        return null;
    }
}

export function hasUnreadBlogDraft() {
    if (!canUseStorage()) return false;
    return window.localStorage.getItem(BLOG_DRAFT_UNREAD_KEY) === 'true';
}

export function markBlogDraftAsViewed() {
    if (!canUseStorage()) return;

    window.localStorage.setItem(BLOG_DRAFT_UNREAD_KEY, 'false');
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
