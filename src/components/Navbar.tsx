'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                        <Link href="/#features" className="text-gray-300 hover:text-white font-medium transition-colors">
                            Features
                        </Link>
                        <Link href="/#pricing" className="text-gray-300 hover:text-white font-medium transition-colors">
                            Pricing
                        </Link>
                        <Link href="/#testimonials" className="text-gray-300 hover:text-white font-medium transition-colors">
                            Testimonials
                        </Link>
                        <Link href="/dashboard/crm" className="text-gray-300 hover:text-white font-medium transition-colors flex items-center gap-1">
                            CRM Login
                        </Link>
                        <Link href="/dashboard/leads" className="text-gray-300 hover:text-white font-medium transition-colors flex items-center gap-1">
                            Lead Extractor
                        </Link>
                        <Link href="/hub" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
                            Resources
                        </Link>
                        <Link
                            href="/demo"
                            className="bg-white text-black px-5 py-2.5 rounded-full font-semibold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:-translate-y-0.5"
                        >
                            Book Demo
                        </Link>
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
                <div className="md:hidden bg-[#0F0F0F] border-b border-white/5 shadow-2xl px-6 pt-4 pb-8 space-y-5 rounded-b-2xl">
                    <Link
                        href="/#features"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-gray-300 hover:text-white font-medium text-lg transition-colors border-b border-white/5 pb-3"
                    >
                        Features
                    </Link>
                    <Link
                        href="/#pricing"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-gray-300 hover:text-white font-medium text-lg transition-colors border-b border-white/5 pb-3"
                    >
                        Pricing
                    </Link>
                    <Link
                        href="/#testimonials"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-gray-300 hover:text-white font-medium text-lg transition-colors border-b border-white/5 pb-3"
                    >
                        Testimonials
                    </Link>
                    <Link
                        href="/dashboard/crm"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-gray-300 hover:text-white font-medium text-lg transition-colors border-b border-white/5 pb-3"
                    >
                        CRM Login
                    </Link>
                    <Link
                        href="/dashboard/leads"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-gray-300 hover:text-white font-medium text-lg transition-colors border-b border-white/5 pb-3"
                    >
                        Lead Extractor
                    </Link>
                    <Link
                        href="/hub"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-blue-400 hover:text-blue-300 font-bold text-lg transition-colors border-b border-white/5 pb-3"
                    >
                        Resources
                    </Link>
                    <Link
                        href="/demo"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block w-full text-center bg-white text-black px-5 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] mt-6"
                    >
                        Book Demo
                    </Link>
                </div>
            )}
        </nav>
    );
}
