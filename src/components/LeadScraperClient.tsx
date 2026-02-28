'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Play, Pause, Database, Download, CheckCircle2, Clock, RefreshCw, Send, Activity, Eye, EyeOff, Lock, Zap } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startScraperJob, syncAllExtractedToCrm, syncLeadToCrm, getScraperStatus, cancelScraperJob } from '@/app/actions/scraper';
import { revealLeadContact } from '@/app/actions/credits';
import { createCheckoutSession } from '@/app/actions/billing';

interface Lead {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    source: string;
    status: string;
    isRevealed: boolean;
    createdAt: Date;
}

export function LeadScraperClient({ initialLeads }: { initialLeads: Lead[] }) {
    const router = useRouter();
    const [zipCode, setZipCode] = useState('75201');
    const [isScraping, setIsScraping] = useState(false);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [jobProgress, setJobProgress] = useState<{ phase: string; percent: number } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRevealing, setIsRevealing] = useState<string | null>(null);
    const [queueWarning, setQueueWarning] = useState('');
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isUpgrading, setIsUpgrading] = useState(false);

    const handleCancel = async () => {
        if (!activeJobId) return;
        setIsCancelling(true);
        const res = await cancelScraperJob(activeJobId);
        if (res.success) {
            setQueueWarning('Extraction stopped successfully. 10 Extracts have been refunded.');
        } else {
            setQueueWarning(res.error || 'Failed to stop extraction.');
        }
        setIsCancelling(false);
    };

    const handleStart = async () => {
        setIsScraping(true);
        setQueueWarning('');
        setErrorCode(null);

        const result = await startScraperJob(zipCode);

        if (!result.success || !result.jobId) {
            setIsScraping(false);
            setQueueWarning(result.error || 'Failed to start queue due to an unknown Server error.');
            setErrorCode(result.errorCode || null);
            return; // Immediately halt the function so polling isn't triggered
        }

        setActiveJobId(result.jobId);
        setJobProgress({ phase: 'Connecting to Redis Queue...', percent: 0 });

        const pollInterval = setInterval(async () => {
            const statusRes = await getScraperStatus(result.jobId!);

            if (statusRes.success) {
                setJobProgress((statusRes.progress as { phase: string; percent: number }) || { phase: 'Starting Job...', percent: 0 });

                if (statusRes.state === 'completed' || statusRes.state === 'failed') {
                    clearInterval(pollInterval);
                    setIsScraping(false);
                    setActiveJobId(null);

                    if (statusRes.state === 'failed') {
                        setQueueWarning('The extraction job failed. Please check the backend logs.');
                    }

                    router.refresh();
                }
            } else {
                // Fallback
                clearInterval(pollInterval);
                setIsScraping(false);
                setActiveJobId(null);
                router.refresh();
            }
        }, 1000);
    };

    const handleBulkSync = async () => {
        setIsSyncing(true);
        await syncAllExtractedToCrm();
        setIsSyncing(false);
    };

    const handleSingleSync = async (id: string) => {
        await syncLeadToCrm(id);
    };

    const handleReveal = async (id: string) => {
        setIsRevealing(id);
        const result = await revealLeadContact(id);
        if (!result.success) {
            setQueueWarning(result.error || 'Failed to unlock lead.');
        } else {
            setQueueWarning('');
        }
        setIsRevealing(null);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-8 text-gray-100">
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Lead Scraper Engine</h1>
                    <p className="text-gray-400 font-light text-sm">Automate stealth extraction of newly sold or listed properties via Zillow, and automatically enrich with Skip Tracing.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.refresh()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-gray-300 rounded-lg hover:bg-[#222] border border-white/5 transition-all text-sm font-medium"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh Data
                    </button>
                    <button
                        onClick={handleBulkSync}
                        disabled={isSyncing || initialLeads.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 rounded-lg transition-all text-sm font-medium disabled:opacity-50"
                    >
                        <Database className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} /> {isSyncing ? 'Syncing...' : 'Sync All to CRM'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Scraper Control Panel */}
                <Card className="bg-[#111] border-white/5 shadow-md lg:col-span-1">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                            <Play className="w-4 h-4 text-blue-400" /> Job Configurations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Target ZIP Code</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={zipCode}
                                        onChange={(e) => setZipCode(e.target.value)}
                                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Property Filter</label>
                                <select className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer">
                                    <option>Recently Sold</option>
                                    <option>For Sale (By Owner)</option>
                                    <option>For Rent</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Proxies Active</span>
                                    <span className="text-green-400 font-mono">14 nodes</span>
                                </div>
                                <div className="flex justify-between text-sm mb-6">
                                    <span className="text-gray-400">Stealth Plugin</span>
                                    <span className="text-green-400 font-mono">Enabled</span>
                                </div>

                                {queueWarning && (
                                    <div className={`p-4 rounded-xl text-sm mb-4 border ${errorCode === 'UPGRADE_REQUIRED' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                        <p className={errorCode === 'UPGRADE_REQUIRED' ? 'text-indigo-200 mb-3 font-medium cursor-default' : ''}>
                                            {queueWarning}
                                        </p>
                                        {errorCode === 'UPGRADE_REQUIRED' && (
                                            <button
                                                onClick={async () => {
                                                    setIsUpgrading(true);
                                                    const res = await createCheckoutSession('INTRO');
                                                    if (res.success && res.url) {
                                                        window.location.href = res.url;
                                                    } else {
                                                        setQueueWarning('Failed to connect to billing server.');
                                                        setIsUpgrading(false);
                                                    }
                                                }}
                                                disabled={isUpgrading}
                                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2"
                                            >
                                                {isUpgrading ? <Activity className="w-4 h-4 animate-pulse" /> : <Zap className="w-4 h-4" />}
                                                Upgrade to Intro Tier ($34.99)
                                            </button>
                                        )}
                                        {queueWarning.includes('Redis') && (
                                            <p className="mt-2 opacity-70 text-xs text-red-300">Make sure your local Redis server is running (e.g. `brew services start redis`).</p>
                                        )}
                                    </div>
                                )}

                                {isScraping ? (
                                    <button
                                        onClick={handleCancel}
                                        disabled={isCancelling}
                                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isCancelling
                                            ? 'bg-red-600/50 text-white cursor-not-allowed'
                                            : 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:bg-red-500 hover:shadow-[0_0_25px_rgba(220,38,38,0.6)]'
                                            }`}
                                    >
                                        {isCancelling ? (
                                            <><Activity className="w-5 h-5 animate-pulse" /> Stopping...</>
                                        ) : (
                                            <><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /></svg> Stop Extraction</>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleStart}
                                        className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500"
                                    >
                                        <Play className="w-5 h-5 fill-white" /> Start Extraction
                                    </button>
                                )}

                                {isScraping && jobProgress && (
                                    <div className="mt-4 bg-[#161616] p-4 rounded-xl border border-white/5 space-y-3 relative group">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-blue-400 font-medium flex items-center gap-1.5">
                                                <Activity className="w-3.5 h-3.5 animate-pulse" /> {jobProgress.phase || 'Queuing...'}
                                            </span>
                                            <span className="text-gray-400 font-mono font-bold bg-[#1A1A1A] px-2 py-0.5 rounded border border-white/5">
                                                {jobProgress.percent || 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-blue-900/20 rounded-full h-2 border border-blue-500/10 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-blue-600 to-indigo-500 h-2 rounded-full transition-all duration-700 ease-out relative"
                                                style={{ width: `${jobProgress.percent || 0}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 w-full animate-pulse rounded-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Live Scrape Results Table */}
                <Card className="bg-[#111] border-white/5 shadow-md lg:col-span-2 flex flex-col">
                    <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-white">Extracted Queue</CardTitle>
                        <span className="px-3 py-1 bg-[#1A1A1A] border border-white/5 rounded-full text-xs text-gray-400 font-mono">
                            {initialLeads.length} leads found
                        </span>
                    </CardHeader>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="text-xs uppercase bg-[#161616] text-gray-500 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 font-medium tracking-wider">Property Owner</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Address</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Phone / SMS</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Enrichment</th>
                                    <th className="px-6 py-4 font-medium tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {initialLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            No leads have been extracted yet. Start a job to populate this table.
                                        </td>
                                    </tr>
                                )}
                                {initialLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-[#161616] transition-colors relative group">
                                        <td className="px-6 py-4 font-medium text-gray-200">
                                            {lead.isRevealed ? (
                                                lead.name
                                            ) : (
                                                <span className="flex items-center gap-2 text-gray-500 blur-[2px] select-none pointer-events-none group-hover:blur-sm transition-all">John Doe *****</span>
                                            )}
                                            <span className="block text-[10px] text-gray-500 mt-1">
                                                Added: {new Date(lead.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{lead.address || 'Unknown'}</td>
                                        <td className="px-6 py-4 font-mono text-gray-300">
                                            {lead.phone ? (
                                                lead.isRevealed ? (
                                                    lead.phone
                                                ) : (
                                                    <span className="text-gray-500 blur-[2px] select-none pointer-events-none group-hover:blur-sm transition-all">(***) ***-****</span>
                                                )
                                            ) : (
                                                'Pending'
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.phone ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
                                                    <CheckCircle2 className="w-3 h-3" /> Traced
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                    <Clock className="w-3 h-3" /> No Match
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                            {!lead.isRevealed && (
                                                <button
                                                    onClick={() => handleReveal(lead.id)}
                                                    disabled={isRevealing === lead.id}
                                                    className={`px-3 py-1.5 flex items-center gap-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${isRevealing === lead.id
                                                        ? 'bg-blue-600/30 text-blue-400 cursor-not-allowed'
                                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                                                        }`}
                                                >
                                                    {isRevealing === lead.id ? (
                                                        <Activity className="w-3.5 h-3.5 animate-pulse" />
                                                    ) : (
                                                        <Lock className="w-3.5 h-3.5" />
                                                    )}
                                                    50 Credits
                                                </button>
                                            )}
                                            {lead.isRevealed && (
                                                <button
                                                    onClick={() => handleSingleSync(lead.id)}
                                                    className="p-2 bg-[#2A2A2A] hover:bg-green-500/20 hover:text-green-400 text-gray-400 rounded-md transition-all border border-transparent hover:border-green-500/30"
                                                    title="Send to CRM"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
