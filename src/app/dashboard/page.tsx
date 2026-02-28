import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowUpRight, Users, DollarSign, Activity, Percent, Zap } from 'lucide-react';
import Link from 'next/link';
import { ensureOrganization } from '@/app/actions/auth';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';

export default async function DashboardOverview() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { users: true }
    });

    const activeUserName = org?.users[0]?.name || org?.users[0]?.email?.split('@')[0] || 'User';

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-8 text-gray-100">
            <div className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome back, {activeUserName}</h1>
                <p className="text-gray-400 font-light">Here is an overview of your business performance today.</p>
            </div>

            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Card className="bg-[#111] border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-blue-500/20 transition-all"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Total Active Leads
                            <Users className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white mb-1">1,248</div>
                        <p className="text-xs text-green-400 flex items-center gap-1 font-medium">
                            <ArrowUpRight className="w-3 h-3" /> +12% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-green-500/20 transition-all"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Monthly Recurring Revenue
                            <DollarSign className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white mb-1">$45,231</div>
                        <p className="text-xs text-green-400 flex items-center gap-1 font-medium">
                            <ArrowUpRight className="w-3 h-3" /> +18.2% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-purple-500/20 transition-all"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Auto-Close Rate (AI)
                            <Percent className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white mb-1">24.5%</div>
                        <p className="text-xs text-green-400 flex items-center gap-1 font-medium">
                            <ArrowUpRight className="w-3 h-3" /> +4.1% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-yellow-500/20 transition-all"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Active Jobs Running
                            <Activity className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white mb-1">12</div>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            across 4 service areas
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart / Activity Area */}
                <div className="lg:col-span-2">
                    <Card className="bg-[#111] border-white/5 shadow-md h-full">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="text-lg font-semibold text-white">Scraping Engine Pulse</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 relative h-[300px] flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent z-10"></div>
                            {/* Fake visual chart via linear gradients */}
                            <div className="w-full h-full flex items-end justify-between px-4 pb-8 space-x-2">
                                {[40, 70, 45, 90, 65, 85, 55, 100, 75, 40, 60, 30].map((height, i) => (
                                    <div key={i} className="w-full bg-blue-500/20 rounded-t-sm relative group overflow-hidden" style={{ height: `${height}%` }}>
                                        <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all group-hover:bg-blue-400" style={{ height: 'max(4px, 10%)' }}></div>
                                    </div>
                                ))}
                            </div>
                            <div className="absolute inset-x-0 bottom-4 flex justify-between text-xs text-gray-500 px-6 z-20">
                                <span>12 AM</span>
                                <span>6 AM</span>
                                <span>12 PM</span>
                                <span>6 PM</span>
                                <span>Now</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Live Activity Feed */}
                <div className="lg:col-span-1">
                    <Card className="bg-[#111] border-white/5 shadow-md h-full flex flex-col">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="text-lg font-semibold text-white">Recent AI Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 flex-1 overflow-y-auto pr-2">
                            <div className="space-y-6">

                                <div className="flex gap-4 relative">
                                    <div className="absolute top-6 bottom-[-24px] left-[15px] w-px bg-white/10"></div>
                                    <div className="w-8 h-8 rounded-full bg-blue-900/50 border border-blue-500/30 flex items-center justify-center shrink-0 z-10 ring-4 ring-[#111]">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-200">AI closed lead via Web Chat</h4>
                                        <p className="text-xs text-gray-400 mt-1">"John Smith" confirmed pricing for driveway wash. Total value: <span className="text-green-400 font-medium">$450</span>.</p>
                                        <span className="text-[10px] text-gray-500 mt-2 block">12 mins ago</span>
                                    </div>
                                </div>

                                <div className="flex gap-4 relative">
                                    <div className="absolute top-6 bottom-[-24px] left-[15px] w-px bg-white/10"></div>
                                    <div className="w-8 h-8 rounded-full bg-yellow-900/50 border border-yellow-500/30 flex items-center justify-center shrink-0 z-10 ring-4 ring-[#111]">
                                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-200">Playwright Scraper batch finished</h4>
                                        <p className="text-xs text-gray-400 mt-1">Processed 145 newly sold properties in ZIP 75001. Enriched 87 owner phone numbers successfully.</p>
                                        <span className="text-[10px] text-gray-500 mt-2 block">2 hours ago</span>
                                    </div>
                                </div>

                                <div className="flex gap-4 relative">
                                    <div className="absolute top-6 bottom-[-24px] left-[15px] w-px bg-white/10"></div>
                                    <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center shrink-0 z-10 ring-4 ring-[#111]">
                                        <Activity className="w-3.5 h-3.5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-200">Visual Estimate Uploaded</h4>
                                        <p className="text-xs text-gray-400 mt-1">New SMS containing roof damage photo. Vision API classified as "SEVERE". Quoted bracket $1,500 - $3,000.</p>
                                        <span className="text-[10px] text-gray-500 mt-2 block">5 hours ago</span>
                                    </div>
                                </div>

                                <div className="flex gap-4 relative">
                                    <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center shrink-0 z-10 ring-4 ring-[#111]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-200">New SEO Blog Published</h4>
                                        <p className="text-xs text-gray-400 mt-1">"Why You Need Soft Washing in [City]" published and indexed.</p>
                                        <span className="text-[10px] text-gray-500 mt-2 block">Yesterday</span>
                                    </div>
                                </div>

                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
