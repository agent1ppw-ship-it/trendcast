'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddLeadModal } from '@/components/AddLeadModal';
import { LeadCard } from '@/components/LeadCard';
import { enrichCrmLead, type PriorityBand } from '@/lib/crm/intelligence';
import { CalendarCheck2, Clock3, DollarSign, Filter, Search, Send, Target, TrendingUp, Users } from 'lucide-react';

type PipelineStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST';

interface LeadViewModel {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    source: string;
    status: string;
    isRevealed: boolean;
    createdAt: string;
}

const PIPELINE_COLUMNS: PipelineStatus[] = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'];

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

export function CrmCommandCenterClient({ initialLeads }: { initialLeads: LeadViewModel[] }) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | PipelineStatus>('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [priorityFilter, setPriorityFilter] = useState<'ALL' | PriorityBand>('ALL');
    const [sortBy, setSortBy] = useState<'NEWEST' | 'SCORE' | 'VALUE'>('NEWEST');

    const enrichedLeads = useMemo(() => {
        return initialLeads.map((lead) => {
            const intel = enrichCrmLead(lead);
            return {
                ...lead,
                ...intel,
                estimateRange: `${formatCurrency(intel.estimatedLow)} - ${formatCurrency(intel.estimatedHigh)}`,
                leadScoreComputed: intel.leadScore,
                createdAtDate: new Date(lead.createdAt),
            };
        });
    }, [initialLeads]);

    const sourceOptions = useMemo(() => {
        return ['ALL', ...Array.from(new Set(enrichedLeads.map((lead) => lead.source))).sort((a, b) => a.localeCompare(b))];
    }, [enrichedLeads]);

    const filteredLeads = useMemo(() => {
        const search = query.trim().toLowerCase();

        const base = enrichedLeads.filter((lead) => {
            if (statusFilter !== 'ALL' && lead.status !== statusFilter) return false;
            if (sourceFilter !== 'ALL' && lead.source !== sourceFilter) return false;
            if (priorityFilter !== 'ALL' && lead.priorityBand !== priorityFilter) return false;

            if (!search) return true;
            const haystack = [
                lead.name,
                lead.phone || '',
                lead.address || '',
                lead.source,
                lead.serviceFocus,
                lead.nextBestAction,
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(search);
        });

        if (sortBy === 'SCORE') {
            return base.sort((a, b) => b.leadScore - a.leadScore);
        }

        if (sortBy === 'VALUE') {
            return base.sort((a, b) => b.estimatedMid - a.estimatedMid);
        }

        return base.sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());
    }, [enrichedLeads, priorityFilter, query, sortBy, sourceFilter, statusFilter]);

    const metrics = useMemo(() => {
        const total = enrichedLeads.length;
        const won = enrichedLeads.filter((lead) => lead.status === 'WON').length;
        const quoted = enrichedLeads.filter((lead) => lead.status === 'QUOTED').length;
        const activePipeline = enrichedLeads.filter((lead) => lead.status !== 'LOST' && lead.status !== 'WON');
        const pipelineValue = activePipeline.reduce((sum, lead) => sum + lead.estimatedMid, 0);
        const urgent = enrichedLeads.filter((lead) => lead.priorityBand === 'URGENT' || lead.priorityBand === 'HIGH').length;
        const followUps = enrichedLeads.filter((lead) => lead.dueSoon && lead.status !== 'LOST').length;
        const closeRate = total === 0 ? 0 : Math.round((won / total) * 100);

        return {
            total,
            won,
            quoted,
            pipelineValue,
            urgent,
            followUps,
            closeRate,
        };
    }, [enrichedLeads]);

    const dispatchQueue = useMemo(() => {
        return enrichedLeads
            .filter((lead) => lead.status === 'WON' || lead.status === 'QUOTED')
            .sort((a, b) => b.leadScore - a.leadScore)
            .slice(0, 10);
    }, [enrichedLeads]);

    const followUpQueue = useMemo(() => {
        return enrichedLeads
            .filter((lead) => lead.dueSoon && lead.status !== 'LOST' && lead.status !== 'WON')
            .sort((a, b) => b.leadScore - a.leadScore)
            .slice(0, 10);
    }, [enrichedLeads]);

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-4 md:p-8">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Home Service CRM Command Center</h1>
                    <p className="mt-2 text-sm font-light text-gray-400">
                        Pipeline, dispatch readiness, and follow-up intelligence in one workspace.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/dashboard/mail"
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:bg-[#222]"
                    >
                        <Send className="h-4 w-4" /> Direct Mail
                    </Link>
                    <AddLeadModal />
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs tracking-wide text-gray-400 uppercase flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Active Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{metrics.total}</p>
                        <p className="mt-1 text-xs text-gray-500">{metrics.quoted} in quote stage</p>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs tracking-wide text-gray-400 uppercase flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Forecast Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{formatCurrency(metrics.pipelineValue)}</p>
                        <p className="mt-1 text-xs text-gray-500">Expected deal value</p>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs tracking-wide text-gray-400 uppercase flex items-center gap-2"><Target className="w-4 h-4 text-amber-400" /> Conversion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{metrics.closeRate}%</p>
                        <p className="mt-1 text-xs text-gray-500">{metrics.won} closed-won leads</p>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs tracking-wide text-gray-400 uppercase flex items-center gap-2"><Clock3 className="w-4 h-4 text-rose-400" /> Follow-Up Pressure</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{metrics.followUps}</p>
                        <p className="mt-1 text-xs text-gray-500">{metrics.urgent} high/urgent priority</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="mb-6 border-white/5 bg-[#111]">
                <CardContent className="p-4 md:p-5">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div className="xl:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search name, phone, address, next action..."
                                className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] py-2 pl-10 pr-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | PipelineStatus)}
                            className="rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-gray-200 focus:border-blue-500/50 focus:outline-none"
                        >
                            <option value="ALL">All statuses</option>
                            {PIPELINE_COLUMNS.map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                        <select
                            value={sourceFilter}
                            onChange={(event) => setSourceFilter(event.target.value)}
                            className="rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-gray-200 focus:border-blue-500/50 focus:outline-none"
                        >
                            {sourceOptions.map((source) => (
                                <option key={source} value={source}>
                                    {source === 'ALL' ? 'All sources' : source}
                                </option>
                            ))}
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                            <select
                                value={priorityFilter}
                                onChange={(event) => setPriorityFilter(event.target.value as 'ALL' | PriorityBand)}
                                className="rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-gray-200 focus:border-blue-500/50 focus:outline-none"
                            >
                                <option value="ALL">All priority</option>
                                <option value="URGENT">Urgent</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                            </select>
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value as 'NEWEST' | 'SCORE' | 'VALUE')}
                                className="rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-gray-200 focus:border-blue-500/50 focus:outline-none"
                            >
                                <option value="NEWEST">Newest</option>
                                <option value="SCORE">Best score</option>
                                <option value="VALUE">Highest value</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5" />
                        Showing {filteredLeads.length} of {enrichedLeads.length} leads
                    </div>
                </CardContent>
            </Card>

            <div className="mb-8 flex gap-5 overflow-x-auto pb-4 snap-x">
                {PIPELINE_COLUMNS.map((column) => {
                    const columnLeads = filteredLeads.filter((lead) => lead.status === column);
                    const columnValue = columnLeads.reduce((sum, lead) => sum + lead.estimatedMid, 0);
                    return (
                        <div key={column} className="w-[320px] shrink-0 snap-start">
                            <div className="mb-2 flex items-center justify-between rounded-t-xl border border-white/10 bg-[#1C1C1C] px-4 py-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-200">{column}</h3>
                                    <p className="text-[11px] text-gray-500">{formatCurrency(columnValue)}</p>
                                </div>
                                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-400">
                                    {columnLeads.length}
                                </span>
                            </div>
                            <div className="min-h-[500px] space-y-3 rounded-b-xl border border-white/10 border-t-0 bg-[#111] p-2.5">
                                {columnLeads.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-white/10 bg-[#141414] p-4 text-center text-xs text-gray-500">
                                        No leads in this stage.
                                    </div>
                                )}
                                {columnLeads.map((lead) => (
                                    <LeadCard
                                        key={lead.id}
                                        lead={{
                                            ...lead,
                                            createdAt: lead.createdAtDate.toISOString(),
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-white flex items-center gap-2 text-base">
                            <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
                            Dispatch Readiness
                        </CardTitle>
                        <p className="text-xs text-gray-500">Quoted and won opportunities prioritized for scheduling.</p>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5">
                            {dispatchQueue.length === 0 && (
                                <div className="px-5 py-6 text-sm text-gray-500">No jobs ready for dispatch yet.</div>
                            )}
                            {dispatchQueue.map((lead) => (
                                <div key={lead.id} className="px-5 py-4 flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-100 truncate">{lead.name}</p>
                                        <p className="text-xs text-gray-400 mt-1 truncate">{lead.address || 'No address on file'}</p>
                                        <p className="text-xs text-emerald-300 mt-1">{lead.serviceFocus}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold text-white">{formatCurrency(lead.estimatedMid)}</p>
                                        <p className="text-[11px] text-gray-500">score {lead.leadScore}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-white flex items-center gap-2 text-base">
                            <TrendingUp className="w-4 h-4 text-amber-400" />
                            AI Follow-Up Queue
                        </CardTitle>
                        <p className="text-xs text-gray-500">Leads needing attention with suggested next actions.</p>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5">
                            {followUpQueue.length === 0 && (
                                <div className="px-5 py-6 text-sm text-gray-500">No immediate follow-ups detected.</div>
                            )}
                            {followUpQueue.map((lead) => (
                                <div key={lead.id} className="px-5 py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-100 truncate">{lead.name}</p>
                                            <p className="mt-1 text-xs text-amber-300 break-words">{lead.nextBestAction}</p>
                                        </div>
                                        <span className="shrink-0 rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
                                            {lead.priorityBand}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

