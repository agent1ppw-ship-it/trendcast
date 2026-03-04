'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

const desktopNavItems = [
    { href: '/#features', label: 'Features' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/signup?mode=signin', label: 'CRM Login' },
    { href: '/dashboard/leads', label: 'Lead Extractor' },
    { href: '/hub', label: 'Resources', accent: true },
];

const mobileNavItems = [
    { href: '/#features', label: 'Features' },
    { href: '/#pricing', label: 'Pricing' },
    { href: '/signup?mode=signin', label: 'CRM Login' },
    { href: '/dashboard/leads', label: 'Lead Extractor' },
    { href: '/dashboard/businesses', label: 'Business Finder' },
    { href: '/dashboard/keywords', label: 'Keyword Opportunities' },
    { href: '/dashboard/blog-posts', label: 'Blog Posts' },
    { href: '/dashboard/analytics', label: 'Analytics' },
    { href: 'https://clipgenerator.ai', label: 'AI Video Suite', external: true },
    { href: '/hub', label: 'Resources', accent: true },
];

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { status } = useSession();
    const isSignedIn = status === 'authenticated';

    return (
        <nav className="fixed top-0 w-full bg-[#0A0A0A]/70 backdrop-blur-xl z-50 border-b border-white/10 supports-[backdrop-filter]:bg-[#0A0A0A]/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                <span className="text-white font-bold text-xl drop-shadow-md">T</span>
                            </div>
                            <span className="font-extrabold text-2xl tracking-tight text-white">
                                trendcast<span className="text-blue-500">.io</span>
                            </span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex space-x-8 items-center">
                        {desktopNavItems.map(({ href, label, accent }) => (
                            <Link
                                key={href}
                                href={href}
                                className={accent
                                    ? 'text-blue-400 hover:text-blue-300 font-bold transition-colors'
                                    : 'text-gray-300 hover:text-white font-medium transition-colors'}
                            >
                                {label}
                            </Link>
                        ))}
                        {isSignedIn ? (
                            <button
                                type="button"
                                onClick={() => signOut({ callbackUrl: '/signup?mode=signin' })}
                                className="bg-white text-black px-5 py-2.5 rounded-full font-semibold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:-translate-y-0.5"
                            >
                                Sign Out
                            </button>
                        ) : (
                            <Link
                                href="/signup"
                                className="bg-white text-black px-5 py-2.5 rounded-full font-semibold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:-translate-y-0.5"
                            >
                                Login / Signup
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            className="text-gray-300 hover:text-white focus:outline-none p-2"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Dropdown Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain bg-[#0F0F0F] border-b border-white/5 shadow-2xl px-6 pt-4 pb-[max(env(safe-area-inset-bottom),2rem)] space-y-3 rounded-b-2xl">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-500">
                        Explore Trendcast
                    </div>
                    {mobileNavItems.map(({ href, label, accent, external }) => (
                        <Link
                            key={href}
                            href={href}
                            target={external ? '_blank' : undefined}
                            rel={external ? 'noreferrer noopener' : undefined}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={accent
                                ? 'block border-b border-white/5 pb-3 text-lg font-bold text-blue-400 transition-colors hover:text-blue-300'
                                : 'block border-b border-white/5 pb-3 text-lg font-medium text-gray-300 transition-colors hover:text-white'}
                        >
                            {label}
                        </Link>
                    ))}
                    {isSignedIn ? (
                        <button
                            type="button"
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                signOut({ callbackUrl: '/signup?mode=signin' });
                            }}
                            className="block w-full text-center bg-white text-black px-5 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] mt-6"
                        >
                            Sign Out
                        </button>
                    ) : (
                        <Link
                            href="/signup"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block w-full text-center bg-white text-black px-5 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] mt-6"
                        >
                            Login / Signup
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
}
