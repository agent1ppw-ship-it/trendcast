'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { BarChart, Building2, Clapperboard, FileText, Home, Layers, Mailbox, Settings, Target, Users } from 'lucide-react';
import { hasUnreadBlogDraft, markBlogDraftAsViewed, subscribeToBlogDraftInbox } from '@/lib/blogDraftInbox';

const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/dashboard/crm', label: 'CRM Command Center', icon: Layers },
    { href: '/dashboard/leads', label: 'Lead Scraper', icon: Users },
    { href: '/dashboard/businesses', label: 'Business Finder', icon: Building2 },
    { href: '/dashboard/mail', label: 'Direct Mail', icon: Mailbox },
    { href: '/dashboard/keywords', label: 'Keyword Opportunities', icon: Target },
    { href: '/dashboard/blog-posts', label: 'Blog Posts', icon: FileText },
    { href: 'https://clipgenerator.ai', label: 'AI Video Suite', icon: Clapperboard, external: true },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebarNav() {
    const pathname = usePathname();
    const hasUnreadDraft = useSyncExternalStore(
        subscribeToBlogDraftInbox,
        hasUnreadBlogDraft,
        () => false,
    );

    useEffect(() => {
        if (pathname === '/dashboard/blog-posts') {
            markBlogDraftAsViewed();
        }
    }, [pathname]);

    return (
        <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map(({ href, label, icon: Icon, external }) => {
                const isActive = pathname === href;
                const showUnreadDot = href === '/dashboard/blog-posts' && hasUnreadDraft && !isActive;

                return (
                    <Link
                        key={href}
                        href={href}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noreferrer noopener' : undefined}
                        className={isActive
                            ? 'flex items-center gap-3 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-md font-medium border border-blue-500/20 shadow-inner'
                            : 'flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-[#1A1A1A] hover:text-white rounded-md font-medium transition-all group'}
                    >
                        <Icon className={isActive ? 'w-5 h-5 text-blue-400' : 'w-5 h-5 text-gray-500 group-hover:text-gray-300'} />
                        <span className="flex items-center gap-2">
                            {label}
                            {showUnreadDot && <span className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
