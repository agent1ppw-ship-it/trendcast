'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart, Building2, Home, Layers, Settings, Target, Users } from 'lucide-react';

const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Home },
    { href: '/dashboard/crm', label: 'Pipeline CRM', icon: Layers },
    { href: '/dashboard/leads', label: 'Lead Scraper', icon: Users },
    { href: '/dashboard/businesses', label: 'Business Finder', icon: Building2 },
    { href: '/dashboard/keywords', label: 'Keyword Opportunities', icon: Target },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebarNav() {
    const pathname = usePathname();

    return (
        <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;

                return (
                    <Link
                        key={href}
                        href={href}
                        className={isActive
                            ? 'flex items-center gap-3 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-md font-medium border border-blue-500/20 shadow-inner'
                            : 'flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-[#1A1A1A] hover:text-white rounded-md font-medium transition-all group'}
                    >
                        <Icon className={isActive ? 'w-5 h-5 text-blue-400' : 'w-5 h-5 text-gray-500 group-hover:text-gray-300'} />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}
