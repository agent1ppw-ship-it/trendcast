'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, ExternalLink, Globe, Loader2, MapPin, Phone, Search, Send, Sparkles, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createLead } from '@/app/actions/crm';
import { getBusinessSearchStatus, startBusinessSearchJob } from '@/app/actions/businessFinder';
import type {
    BusinessFinderExtractionDiagnostics,
    BusinessFinderLead,
    BusinessFinderMatchStrategy,
} from '@/lib/businessFinder';

const industryOptions = [
    'Roofing',
    'HVAC',
    'Landscaping',
    'Plumbing',
    'Pressure Washing',
    'Electrical',
    'Concrete',
    'Pest Control',
];

function sanitizeIndustry(industry: string) {
    return industry.trim() || 'Home Services';
}

export function BusinessFinderClient({
    defaultIndustry,
    crmLeadCount,
}: {
    defaultIndustry: string;
    crmLeadCount: number;
}) {
    const [zipCode, setZipCode] = useState('75201');
    const [industry, setIndustry] = useState(sanitizeIndustry(defaultIndustry));
    const [batchSize, setBatchSize] = useState(15);
    const [sourceLabel, setSourceLabel] = useState('Yellow Pages');
    const [matchStrategy, setMatchStrategy] = useState<BusinessFinderMatchStrategy>('exact_zip');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<BusinessFinderLead[]>([]);
    const [sentIds, setSentIds] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('Run a live directory search to populate your lead list.');
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [isSendingAll, setIsSendingAll] = useState(false);
    const [jobProgress, setJobProgress] = useState<{ phase: string; percent: number } | null>(null);
    const [searchDiagnostics, setSearchDiagnostics] = useState<{
        finalUrl?: string;
        pageTitle?: string;
        blocked?: boolean;
        blockReason?: string;
        diagnostics?: BusinessFinderExtractionDiagnostics;
    } | null>(null);

    const availableIndustries = useMemo(() => {
        const normalizedDefault = sanitizeIndustry(defaultIndustry);
        return industryOptions.includes(normalizedDefault)
            ? industryOptions
            : [normalizedDefault, ...industryOptions];
    }, [defaultIndustry]);

    const unsentResults = useMemo(
        () => results.filter((lead) => !sentIds.includes(lead.id)),
        [results, sentIds]
    );

    const handleRunBatch = async () => {
        setIsLoading(true);
        setError('');
        setSearchDiagnostics(null);
        setJobProgress({ phase: 'Queueing live business search...', percent: 5 });
        setStatusMessage('Queueing live business search...');

        const result = await startBusinessSearchJob(zipCode, industry, batchSize);

        if (!result.success) {
            setResults([]);
            setSentIds([]);
            setError(result.error || 'Failed to search businesses.');
            setStatusMessage('No live results were loaded.');
            setMatchStrategy('exact_zip');
            setSearchDiagnostics(null);
            setJobProgress(null);
            setIsLoading(false);
            return;
        }

        const pollInterval = setInterval(async () => {
            const status = await getBusinessSearchStatus(result.jobId!);

            if (!status.success) {
                clearInterval(pollInterval);
                setError(status.error || 'Failed to fetch search progress.');
                setJobProgress(null);
                setIsLoading(false);
                return;
            }

            setJobProgress(status.progress || { phase: 'Searching...', percent: 10 });

            if (status.state === 'completed') {
                clearInterval(pollInterval);
                const liveLeads = status.results ?? [];
                const diagnostics = {
                    finalUrl: status.finalUrl,
                    pageTitle: status.pageTitle,
                    blocked: status.blocked,
                    blockReason: status.blockReason,
                    diagnostics: status.diagnostics,
                };

                setResults(liveLeads);
                setSentIds([]);
                setSourceLabel(status.sourceLabel || 'Yellow Pages');
                setMatchStrategy(status.matchStrategy || 'exact_zip');
                setSearchDiagnostics(diagnostics);
                setJobProgress(null);

                if (status.blocked) {
                    setError(status.blockReason || 'Yellow Pages appears to be blocking the worker.');
                    setStatusMessage('The worker reached Yellow Pages, but the returned page looks blocked.');
                } else if (liveLeads.length === 0) {
                    setStatusMessage(`No businesses were found for ${sanitizeIndustry(industry)} in ${zipCode}. Try a nearby ZIP or a broader industry term.`);
                } else {
                    setStatusMessage(
                        status.matchStrategy === 'area_results'
                            ? `Loaded ${liveLeads.length} live businesses from the ${zipCode} area. Yellow Pages did not expose exact ZIPs for these listings.`
                            : `Loaded ${liveLeads.length} real businesses located in ZIP ${zipCode}.`
                    );
                }

                setIsLoading(false);
            }

            if (status.state === 'failed') {
                clearInterval(pollInterval);
                setError('The live search job failed.');
                setStatusMessage('No live results were loaded.');
                setSearchDiagnostics(null);
                setJobProgress(null);
                setIsLoading(false);
            }
        }, 1500);
    };

    const handleSendSingle = async (lead: BusinessFinderLead) => {
        setSendingId(lead.id);
        setError('');

        const result = await createLead({
            name: lead.name,
            phone: lead.phone,
            address: lead.address,
            source: 'BUSINESS_SCRAPER',
        });

        if (!result.success) {
            setError(result.error || 'Failed to send lead to CRM.');
        } else {
            setSentIds((current) => [...current, lead.id]);
            setStatusMessage(`${lead.name} was added to Pipeline CRM.`);
        }

        setSendingId(null);
    };

    const handleSendAll = async () => {
        if (unsentResults.length === 0) return;

        setIsSendingAll(true);
        setError('');

        const nextSent: string[] = [];

        for (const lead of unsentResults) {
            const result = await createLead({
                name: lead.name,
                phone: lead.phone,
                address: lead.address,
                source: 'BUSINESS_SCRAPER',
            });

            if (result.success) {
                nextSent.push(lead.id);
            } else {
                setError(result.error || 'One or more leads failed to sync.');
                break;
            }
        }

        if (nextSent.length > 0) {
            setSentIds((current) => [...current, ...nextSent]);
            setStatusMessage(`${nextSent.length} business leads were added to Pipeline CRM.`);
        }

        setIsSendingAll(false);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-8 text-gray-100">
            <div className="mb-10 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                <div className="max-w-3xl">
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Business Finder</h1>
                    <p className="text-gray-400 font-light leading-7">
                        Search by ZIP code and industry, pull a live batch of business records, review contact details in a lead list,
                        and send selected companies directly into your Pipeline CRM.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/dashboard/crm"
                        className="px-4 py-2.5 bg-[#161616] border border-white/10 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-[#1B1B1B] transition-all"
                    >
                        Open Pipeline CRM
                    </Link>
                    <button
                        onClick={handleSendAll}
                        disabled={isSendingAll || unsentResults.length === 0}
                        className="px-4 py-2.5 bg-blue-600/10 text-blue-300 border border-blue-500/20 rounded-lg text-sm font-medium hover:bg-blue-600/20 transition-all disabled:opacity-50"
                    >
                        {isSendingAll ? 'Sending Batch...' : 'Send All to CRM'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <Card className="bg-[#111] border-white/5 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Current Batch
                            <Search className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{results.length}</div>
                        <p className="text-xs text-gray-500 mt-1">Real businesses loaded into the lead list</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-white/5 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Ready to Sync
                            <Send className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{unsentResults.length}</div>
                        <p className="text-xs text-gray-500 mt-1">Records not yet pushed into CRM</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-white/5 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            Industry Focus
                            <Building2 className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-extrabold text-white">{sanitizeIndustry(industry)}</div>
                        <p className="text-xs text-gray-500 mt-1">Current live search vertical</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-white/5 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400 flex items-center justify-between">
                            CRM Coverage
                            <Users className="w-4 h-4 text-gray-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-white">{crmLeadCount}</div>
                        <p className="text-xs text-gray-500 mt-1">Existing leads already stored in Pipeline CRM</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-8">
                <Card className="bg-[#111] border-white/5 shadow-md">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-400" />
                            Search Controls
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">ZIP Code</label>
                            <input
                                type="text"
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                                placeholder="75201"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Industry</label>
                            <select
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                            >
                                {availableIndustries.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Batch Size</label>
                            <select
                                value={batchSize}
                                onChange={(e) => setBatchSize(Number(e.target.value))}
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                            >
                                {[10, 15, 25, 50].map((size) => (
                                    <option key={size} value={size}>
                                        {size} businesses
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Directory Source</label>
                            <div className="px-4 py-3 rounded-lg bg-[#161616] border border-white/10 text-sm font-medium text-gray-300">
                                {sourceLabel} (live)
                            </div>
                        </div>

                        <div className="rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300 mb-2">Match Strategy</p>
                            <p className="text-sm text-gray-300 leading-6">
                                {matchStrategy === 'area_results'
                                    ? 'This search is showing live directory results from the searched area because Yellow Pages did not expose exact ZIP codes on the listing cards.'
                                    : 'This search prefers live businesses whose listed postal code exactly matches the ZIP code you entered.'}
                            </p>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        <div className="rounded-xl border border-white/5 bg-[#161616] px-4 py-3 text-sm text-gray-400">
                            {statusMessage}
                        </div>

                        {searchDiagnostics && (
                            <div className="rounded-xl border border-white/5 bg-[#161616] px-4 py-4 space-y-3 text-sm">
                                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Worker Diagnostics</div>
                                <div className="grid gap-2 text-gray-300">
                                    <div>
                                        <span className="text-gray-500">Final URL:</span>{' '}
                                        <span className="break-all">{searchDiagnostics.finalUrl || 'Unavailable'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Page title:</span>{' '}
                                        <span>{searchDiagnostics.pageTitle || 'Unavailable'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Blocked:</span>{' '}
                                        <span>{searchDiagnostics.blocked ? 'Yes' : 'No'}</span>
                                    </div>
                                    {searchDiagnostics.blockReason && (
                                        <div>
                                            <span className="text-gray-500">Reason:</span>{' '}
                                            <span>{searchDiagnostics.blockReason}</span>
                                        </div>
                                    )}
                                </div>

                                {searchDiagnostics.diagnostics && (
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 font-mono">
                                        <div>jsonLdScripts: {searchDiagnostics.diagnostics.jsonLdScriptCount}</div>
                                        <div>jsonLdBusinesses: {searchDiagnostics.diagnostics.jsonLdBusinessCount}</div>
                                        <div>resultCards: {searchDiagnostics.diagnostics.resultCardCount}</div>
                                        <div>textLines: {searchDiagnostics.diagnostics.textLineCount}</div>
                                        <div>exactZipLeads: {searchDiagnostics.diagnostics.exactZipLeadCount}</div>
                                        <div>areaLeads: {searchDiagnostics.diagnostics.areaLeadCount}</div>
                                        <div>textExactLeads: {searchDiagnostics.diagnostics.textExactLeadCount}</div>
                                        <div>textAreaLeads: {searchDiagnostics.diagnostics.textAreaLeadCount}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {isLoading && jobProgress && (
                            <div className="rounded-xl border border-white/5 bg-[#161616] px-4 py-4">
                                <div className="flex items-center justify-between text-xs mb-3">
                                    <span className="text-blue-300">{jobProgress.phase}</span>
                                    <span className="font-mono text-gray-400">{jobProgress.percent}%</span>
                                </div>
                                <div className="w-full bg-blue-900/20 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-700"
                                        style={{ width: `${jobProgress.percent}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleRunBatch}
                            disabled={isLoading}
                            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 disabled:opacity-60"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            {isLoading ? 'Running Live Search...' : 'Run Live Search'}
                        </button>
                    </CardContent>
                </Card>

                <Card className="bg-[#111] border-white/5 shadow-md min-w-0">
                    <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-white">Lead List</CardTitle>
                        <span className="px-3 py-1 bg-[#1A1A1A] border border-white/5 rounded-full text-xs text-gray-400 font-mono">
                            {results.length} records
                        </span>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="text-xs uppercase bg-[#161616] text-gray-500 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 font-medium tracking-wider">Business</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Contact</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Location</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Source</th>
                                    <th className="px-6 py-4 font-medium tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {results.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <div className="max-w-md mx-auto">
                                                <p className="text-base text-gray-300 mb-2">No business leads loaded yet.</p>
                                                <p className="text-sm text-gray-500">Choose a ZIP code and industry, then run a live search to fill this lead list.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {results.map((lead) => {
                                    const isSent = sentIds.includes(lead.id);
                                    const destinationUrl = lead.website || lead.listingUrl;

                                    return (
                                        <tr key={lead.id} className="hover:bg-[#161616] transition-colors align-top">
                                            <td className="px-6 py-5">
                                                <div className="font-semibold text-gray-100">{lead.name}</div>
                                                <div className="text-xs text-gray-500 mt-2">{lead.industry}</div>
                                                {destinationUrl && (
                                                    <a
                                                        href={destinationUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-3"
                                                    >
                                                        <Globe className="w-3.5 h-3.5" />
                                                        {destinationUrl.replace('https://', '')}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Phone className="w-4 h-4 text-gray-500" />
                                                    <span className="font-mono text-gray-300">{lead.phone || 'No phone listed'}</span>
                                                </div>
                                                <div className="mt-3 text-xs text-gray-500">Verified from live directory result</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-start gap-2 text-gray-300">
                                                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                                                    <div>
                                                        <div>{lead.address}</div>
                                                        <div className="text-xs text-gray-500 mt-2">ZIP {lead.zipCode}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                                    {lead.sourceLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => handleSendSingle(lead)}
                                                    disabled={isSent || sendingId === lead.id || isSendingAll}
                                                    className={isSent
                                                        ? 'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-sm font-medium'
                                                        : 'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-gray-200 text-sm font-semibold transition-all disabled:opacity-50'}
                                                >
                                                    {sendingId === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    {isSent ? 'Sent to CRM' : 'Send to CRM'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
