import Link from 'next/link';
import { Home, Users, BarChart, Settings, Layers, Wallet, Search } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ensureOrganization } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const orgId = await ensureOrganization();
    if (!orgId) {
        redirect('/signup');
    }

    const org = await prisma.organization.findUnique({
        where: { id: orgId }
    });

    return (
        <div className="min-h-screen bg-[#050505] flex text-gray-200">
            {/* Sidebar - Dark Glassmorphism */}
            <aside className="w-64 bg-[#0F0F0F] border-r border-white/5 hidden md:flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-10 relative">
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                <div className="h-20 flex items-center px-6 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-[#222] border border-white/10 flex items-center justify-center group-hover:bg-[#333] transition-colors shadow-inner">
                            <span className="text-white font-bold text-xl">T</span>
                        </div>
                        <span className="font-extrabold text-2xl tracking-tight text-white/90 group-hover:text-white transition-colors">
                            trendcast.io
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-[#1A1A1A] hover:text-white rounded-md font-medium transition-all group">
                        <Home className="w-5 h-5 text-gray-500 group-hover:text-gray-300" /> Overview
                    </Link>
                    <Link href="/dashboard/crm" className="flex items-center gap-3 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-md font-medium border border-blue-500/20 shadow-inner">
                        <Layers className="w-5 h-5 text-blue-400" /> Pipeline CRM
                    </Link>
                    <Link href="/dashboard/leads" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-[#1A1A1A] hover:text-white rounded-md font-medium transition-all group">
                        <Users className="w-5 h-5 text-gray-500 group-hover:text-gray-300" /> Lead Scraper
                    </Link>
                    <Link href="/dashboard/analytics" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-[#1A1A1A] hover:text-white rounded-md font-medium transition-all group">
                        <BarChart className="w-5 h-5 text-gray-500 group-hover:text-gray-300" /> Analytics
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-[#1A1A1A] hover:text-white rounded-md font-medium transition-all group">
                        <Settings className="w-5 h-5 text-gray-500 group-hover:text-gray-300" /> Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/5 bg-[#0A0A0A]">
                    <div className="space-y-3 mb-4 px-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium tracking-wide uppercase">
                                <Wallet className="w-3.5 h-3.5 text-blue-400" /> API Credits
                            </div>
                            <span className="text-sm font-bold text-white font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                {org?.credits?.toLocaleString() || 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium tracking-wide uppercase">
                                <Search className="w-3.5 h-3.5 text-emerald-400" /> Extracts
                            </div>
                            <span className="text-sm font-bold text-white font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {org?.extracts?.toLocaleString() || 0}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-[#111] p-2.5 rounded-lg border border-white/5">
                        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg ring-1 ring-white/10 shrink-0">
                            {org?.name ? org.name.substring(0, 2).toUpperCase() : 'TC'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-100 truncate">{org?.name || 'My Business'}</p>
                            <p className="text-[10px] text-gray-500 font-medium tracking-wide truncate">{org?.industry || 'Setup Required'}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full bg-[#0A0A0A] relative">
                {/* Subtle background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-900/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

                {/* Mobile Header (Dark) */}
                <div className="md:hidden h-16 bg-[#0F0F0F] border-b border-white/5 flex items-center px-4 shrink-0 shadow-md">
                    <span className="font-extrabold text-xl tracking-tight text-white">trendcast.io</span>
                </div>

                {/* Children Rendered Here */}
                {children}
            </main>
        </div>
    );
}
