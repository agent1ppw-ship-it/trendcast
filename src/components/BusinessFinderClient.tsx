'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, ExternalLink, Globe, Loader2, MapPin, Phone, Search, Send, Sparkles, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createLead } from '@/app/actions/crm';

type BusinessLead = {
    id: string;
    name: string;
    industry: string;
    zipCode: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    contactName: string;
    employeeRange: string;
    sourceLabel: string;
};

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

const sourceOptions = ['Google Maps', 'Yelp', 'Chamber', 'Trade Directories'];

const cityByZip: Record<string, string> = {
    '75201': 'Dallas, TX',
    '77002': 'Houston, TX',
    '60601': 'Chicago, IL',
    '33130': 'Miami, FL',
    '85004': 'Phoenix, AZ',
};

const firstWords = ['Atlas', 'Summit', 'BlueLine', 'Northstar', 'Prime', 'Beacon', 'Ironwood', 'Elevate', 'Civic', 'TruePoint'];
const secondWords = ['Commercial', 'Service', 'Partners', 'Systems', 'Solutions', 'Works', 'Group', 'Pros', 'Network', 'Collective'];
const employeeBands = ['1-10', '11-25', '26-50', '51-100'];
const contacts = ['Alex Carter', 'Morgan Lee', 'Jordan Diaz', 'Taylor Brooks', 'Cameron Ross', 'Riley Patel', 'Avery Hall', 'Parker Reed'];

function sanitizeIndustry(industry: string) {
    return industry.trim() || 'Home Services';
}

function formatWebsite(name: string) {
    return `https://${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`;
}

function formatPhone(index: number) {
    const base = 1000 + index * 37;
    return `(214) 555-${String(base).slice(-4)}`;
}

function buildBusinessBatch(zipCode: string, industry: string, batchSize: number, sourceLabel: string): BusinessLead[] {
    const safeIndustry = sanitizeIndustry(industry);
    const city = cityByZip[zipCode] || 'Target Market';

    return Array.from({ length: batchSize }, (_, index) => {
        const name = `${firstWords[index % firstWords.length]} ${safeIndustry} ${secondWords[index % secondWords.length]}`;
        const website = formatWebsite(name);

        return {
            id: `${zipCode}-${safeIndustry}-${index}`,
            name,
            industry: safeIndustry,
            zipCode,
            city,
            address: `${200 + index * 7} Market Street, ${city} ${zipCode}`,
            phone: formatPhone(index),
            email: `hello@${website.replace('https://', '')}`,
            website,
            contactName: contacts[index % contacts.length],
            employeeRange: employeeBands[index % employeeBands.length],
            sourceLabel,
        };
    });
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
    const [sourceLabel, setSourceLabel] = useState(sourceOptions[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<BusinessLead[]>([]);
    const [sentIds, setSentIds] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('Run a batch search to populate your lead list.');
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [isSendingAll, setIsSendingAll] = useState(false);
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
        setStatusMessage('Scraping business directories and compiling contact records...');

        await new Promise((resolve) => setTimeout(resolve, 900));

        const nextResults = buildBusinessBatch(zipCode, industry, batchSize, sourceLabel);
        setResults(nextResults);
        setSentIds([]);
        setStatusMessage(`Loaded ${nextResults.length} business leads for ${sanitizeIndustry(industry)} in ${zipCode}.`);
        setIsLoading(false);
    };

    const handleSendSingle = async (lead: BusinessLead) => {
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
                        Search by ZIP code and industry, pull a batch of business records, review contact details in a lead list,
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
                        <p className="text-xs text-gray-500 mt-1">Businesses loaded into the lead list</p>
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
                        <p className="text-xs text-gray-500 mt-1">Current search vertical for batch generation</p>
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
                            <div className="grid grid-cols-2 gap-2">
                                {sourceOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => setSourceLabel(option)}
                                        className={option === sourceLabel
                                            ? 'px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium'
                                            : 'px-3 py-2 rounded-lg bg-[#161616] border border-white/10 text-gray-400 text-sm font-medium hover:text-white'}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/10 to-transparent p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300 mb-2">First Pass Layout</p>
                            <p className="text-sm text-gray-300 leading-6">
                                This page is set up as the product surface for batch business discovery. The UI flow is ready for a real scraper service to replace the generated batch data.
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

                        <button
                            onClick={handleRunBatch}
                            disabled={isLoading}
                            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 disabled:opacity-60"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            {isLoading ? 'Running Batch Search...' : 'Run Batch Search'}
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
                                                <p className="text-sm text-gray-500">Choose a ZIP code and industry, then run a batch search to fill this lead list.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {results.map((lead) => {
                                    const isSent = sentIds.includes(lead.id);

                                    return (
                                        <tr key={lead.id} className="hover:bg-[#161616] transition-colors align-top">
                                            <td className="px-6 py-5">
                                                <div className="font-semibold text-gray-100">{lead.name}</div>
                                                <div className="text-xs text-gray-500 mt-2">{lead.industry} · {lead.employeeRange} employees</div>
                                                <a
                                                    href={lead.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-3"
                                                >
                                                    <Globe className="w-3.5 h-3.5" />
                                                    {lead.website.replace('https://', '')}
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 text-gray-200">
                                                    <Users className="w-4 h-4 text-gray-500" />
                                                    {lead.contactName}
                                                </div>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <Phone className="w-4 h-4 text-gray-500" />
                                                    <span className="font-mono text-gray-300">{lead.phone}</span>
                                                </div>
                                                <div className="mt-3 text-xs text-gray-400">{lead.email}</div>
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
