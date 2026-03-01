import { ensureOrganization } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AnalyticsClient from './AnalyticsClient';
import { Layers, Zap, TrendingUp, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AnalyticsPage() {
    const orgId = await ensureOrganization();
    if (!orgId) redirect('/signup');

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            leads: true,
            jobs: true,
        }
    });

    if (!org) redirect('/signup');

    const totalLeads = org.leads.length;
    const wonLeads = org.leads.filter(l => l.status === 'WON').length;
    const conversionRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // Monthly lead aggregation for chart
    const monthlyLeads = org.leads.reduce((acc, lead) => {
        const month = lead.createdAt.toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Status distribution
    const statusDistribution = org.leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Lead Score Average
    const averageScore = totalLeads ? Math.round(org.leads.reduce((acc, lead) => acc + lead.leadScore, 0) / totalLeads) : 0;

    const chartData = Object.entries(monthlyLeads).map(([month, count]) => ({
        month,
        leads: count
    }));

    const statusData = Object.entries(statusDistribution).map(([name, value]) => ({
        name,
        value
    }));

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-8 text-gray-100">
            <div className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Analytics</h1>
                <p className="text-gray-400 font-light">Deep insights into your pipeline, API usage, and conversion metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Card className="bg-[#111] border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-indigo-500/20 transition-all"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Total API Credits
                            <Zap className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white mb-1">{org.credits.toLocaleString()}</div>
                        <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                            {org.tier} Tier Available
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-pink-500/20 transition-all"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Extracts Remaining
                            <Search className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white mb-1">{org.extracts.toLocaleString()}</div>
                        <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                            Across {totalLeads} saved leads
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-cyan-500/20 transition-all"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Avg Lead Quality Score
                            <TrendingUp className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white mb-1">{averageScore}/100</div>
                        <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                            Based on AI enrichment depth
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-white/5 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-orange-500/20 transition-all"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Pipeline Conversion Rate
                            <Layers className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white mb-1">{conversionRate}%</div>
                        <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                            +{wonLeads} closed deals
                        </p>
                    </CardContent>
                </Card>
            </div>

            <AnalyticsClient
                initialChartData={chartData}
                initialStatusData={statusData}
            />
        </div>
    );
}
