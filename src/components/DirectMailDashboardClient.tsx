'use client';

import { useMemo, useState, useTransition, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Mail, Maximize2, Send, Sparkles, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    cancelMailCampaign,
    createMailCampaign,
    createDirectMailCheckoutSession,
    createMailTemplate,
    saveMailSenderProfile,
    sendMailCampaign,
} from '@/app/actions/mail';

type LeadRecord = {
    id: string;
    name: string;
    address: string | null;
    source: string;
    status: string;
    createdAt: string;
};

type TemplateRecord = {
    id: string;
    name: string;
    type: string;
    size: string;
    frontHeadline: string;
    frontBody: string;
    backHeadline: string | null;
    backBody: string;
    ctaText: string | null;
    accentColor: string;
    imageUrl: string | null;
    isDefault: boolean;
};

type CampaignRecord = {
    id: string;
    name: string;
    status: string;
    stripePaymentStatus: string | null;
    costCents: number;
    sentCount: number;
    failedCount: number;
    postageClass: string;
    createdAt: string;
    scheduledAt: string | null;
    template: {
        name: string;
        size: string;
    };
    orderCount: number;
    recentLobIds: string[];
};

type SenderProfileRecord = {
    mailFromName: string;
    mailFromCompany: string;
    mailAddressLine1: string;
    mailAddressLine2: string;
    mailCity: string;
    mailState: string;
    mailZip: string;
};

const MAX_TEMPLATE_IMAGE_BYTES = 8 * 1024 * 1024;

type PostcardPreviewTemplate = {
    name: string;
    size: string;
    frontHeadline: string;
    frontBody: string;
    backHeadline: string | null;
    backBody: string;
    ctaText: string | null;
    accentColor: string;
    imageUrl: string | null;
};

function formatUsd(cents: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(cents / 100);
}

function applyMergeTags(content: string | null | undefined, lead: LeadRecord | null) {
    if (!content) return '';
    if (!lead) return content;

    const cityStateZipMatch = (lead.address || '').match(/,\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);

    return content
        .replaceAll('{{name}}', lead.name || 'Homeowner')
        .replaceAll('{{address}}', lead.address || 'your property')
        .replaceAll('{{city}}', cityStateZipMatch?.[1] || 'your area')
        .replaceAll('{{state}}', cityStateZipMatch?.[2] || '')
        .replaceAll('{{zip}}', cityStateZipMatch?.[3] || '')
        .replaceAll('{{source}}', lead.source || 'local lead')
        .replaceAll('{{status}}', lead.status || 'new opportunity')
        .replaceAll('{{service}}', `${lead.source.toLowerCase()} lead`);
}

export function DirectMailDashboardClient({
    leads,
    templates,
    campaigns,
    mailMode,
    lobEnvironment,
    senderProfile,
}: {
    leads: LeadRecord[];
    templates: TemplateRecord[];
    campaigns: CampaignRecord[];
    mailMode: 'live' | 'demo';
    lobEnvironment: 'demo' | 'test' | 'live';
    senderProfile: SenderProfileRecord;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [campaignName, setCampaignName] = useState('Neighborhood Postcard Drop');
    const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [postageClass, setPostageClass] = useState<'MARKETING' | 'FIRST_CLASS'>('MARKETING');
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState('');
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateFrontHeadline, setNewTemplateFrontHeadline] = useState('');
    const [newTemplateFrontBody, setNewTemplateFrontBody] = useState('');
    const [newTemplateBackHeadline, setNewTemplateBackHeadline] = useState('');
    const [newTemplateBackBody, setNewTemplateBackBody] = useState('');
    const [newTemplateCta, setNewTemplateCta] = useState('');
    const [newTemplateAccent, setNewTemplateAccent] = useState('#2563EB');
    const [newTemplateImageUrl, setNewTemplateImageUrl] = useState('');
    const [newTemplateImageLabel, setNewTemplateImageLabel] = useState('');
    const [mailFromName, setMailFromName] = useState(senderProfile.mailFromName);
    const [mailFromCompany, setMailFromCompany] = useState(senderProfile.mailFromCompany);
    const [mailAddressLine1, setMailAddressLine1] = useState(senderProfile.mailAddressLine1);
    const [mailAddressLine2, setMailAddressLine2] = useState(senderProfile.mailAddressLine2);
    const [mailCity, setMailCity] = useState(senderProfile.mailCity);
    const [mailState, setMailState] = useState(senderProfile.mailState);
    const [mailZip, setMailZip] = useState(senderProfile.mailZip);
    const [fullPreviewTemplate, setFullPreviewTemplate] = useState<PostcardPreviewTemplate | null>(null);
    const [fullPreviewSide, setFullPreviewSide] = useState<'front' | 'back'>('front');

    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0] || null;

    const filteredLeads = useMemo(() => {
        return leads.filter((lead) => {
            if (!lead.address) return false;
            if (sourceFilter !== 'ALL' && lead.source !== sourceFilter) return false;
            if (statusFilter !== 'ALL' && lead.status !== statusFilter) return false;

            const haystack = `${lead.name} ${lead.address} ${lead.source} ${lead.status}`.toLowerCase();
            return haystack.includes(search.trim().toLowerCase());
        });
    }, [leads, search, sourceFilter, statusFilter]);

    const selectedLeads = useMemo(
        () => leads.filter((lead) => selectedLeadIds.includes(lead.id)),
        [leads, selectedLeadIds],
    );

    const estimatedCost = useMemo(() => {
        const unitPrice = selectedTemplate?.size === '6X9' ? 179 : 149;
        return unitPrice * selectedLeads.length;
    }, [selectedLeads.length, selectedTemplate?.size]);

    const previewLead = selectedLeads[0] || filteredLeads[0] || null;
    const effectivePostageClass = selectedTemplate?.size === '4X6' ? 'FIRST_CLASS' : postageClass;
    const senderProfileComplete = Boolean(
        mailAddressLine1.trim() &&
        mailCity.trim() &&
        mailState.trim() &&
        mailZip.trim() &&
        (mailFromName.trim() || mailFromCompany.trim())
    );
    const draftTemplateForPreview: PostcardPreviewTemplate = {
        name: newTemplateName || 'Custom template',
        size: '4X6',
        frontHeadline: newTemplateFrontHeadline || 'Front headline preview',
        frontBody: newTemplateFrontBody || 'Front body preview text appears here.',
        backHeadline: newTemplateBackHeadline || null,
        backBody: newTemplateBackBody || 'Back body preview text appears here.',
        ctaText: newTemplateCta || null,
        accentColor: newTemplateAccent || '#2563EB',
        imageUrl: newTemplateImageUrl || null,
    };

    const toggleLead = (leadId: string) => {
        setSelectedLeadIds((current) => (
            current.includes(leadId)
                ? current.filter((id) => id !== leadId)
                : [...current, leadId]
        ));
    };

    const selectAllVisible = () => {
        setSelectedLeadIds(Array.from(new Set([...selectedLeadIds, ...filteredLeads.map((lead) => lead.id)])));
    };

    const clearSelection = () => setSelectedLeadIds([]);
    const openFullPreview = (template: PostcardPreviewTemplate, side: 'front' | 'back' = 'front') => {
        setFullPreviewTemplate(template);
        setFullPreviewSide(side);
    };

    const handleCreateCampaign = (sendImmediately: boolean) => {
        setError('');
        setFeedback('');

        if (sendImmediately && !senderProfileComplete) {
            setError('Complete your sender profile before sending mail.');
            return;
        }

        startTransition(async () => {
            const createResult = await createMailCampaign({
                name: campaignName,
                templateId: selectedTemplateId,
                leadIds: selectedLeadIds,
                postageClass,
            });

            if (!createResult.success || !createResult.campaignId) {
                setError(createResult.error || 'Failed to create campaign.');
                return;
            }

            if (sendImmediately) {
                if (mailMode === 'live') {
                    const checkoutResult = await createDirectMailCheckoutSession(createResult.campaignId);
                    if (!checkoutResult.success || !checkoutResult.url) {
                        setError(checkoutResult.error || 'Failed to create direct mail checkout.');
                        return;
                    }

                    window.location.href = checkoutResult.url;
                    return;
                } else {
                    const sendResult = await sendMailCampaign(createResult.campaignId);
                    if (!sendResult.success) {
                        setError(sendResult.error || 'Failed to send campaign.');
                        return;
                    }

                    setFeedback(sendResult.message || 'Campaign processed.');
                }
            } else {
                setFeedback('Campaign draft saved.');
            }

            router.refresh();
        });
    };

    const handleCreateTemplate = () => {
        setError('');
        setFeedback('');

        startTransition(async () => {
            const result = await createMailTemplate({
                name: newTemplateName,
                frontHeadline: newTemplateFrontHeadline,
                frontBody: newTemplateFrontBody,
                backHeadline: newTemplateBackHeadline,
                backBody: newTemplateBackBody,
                ctaText: newTemplateCta,
                accentColor: newTemplateAccent,
                imageUrl: newTemplateImageUrl,
            });

            if (!result.success) {
                setError(result.error || 'Failed to create template.');
                return;
            }

            setFeedback('Template saved.');
            setNewTemplateName('');
            setNewTemplateFrontHeadline('');
            setNewTemplateFrontBody('');
            setNewTemplateBackHeadline('');
            setNewTemplateBackBody('');
            setNewTemplateCta('');
            setNewTemplateImageUrl('');
            setNewTemplateImageLabel('');
            router.refresh();
        });
    };

    const handleTemplateImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Upload an image file (PNG, JPG, WEBP, or GIF).');
            event.target.value = '';
            return;
        }

        if (file.size > MAX_TEMPLATE_IMAGE_BYTES) {
            setError('Image is too large. Keep uploads under 8MB.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            if (!result.startsWith('data:image/')) {
                setError('Failed to read the selected image.');
                return;
            }

            setNewTemplateImageUrl(result);
            setNewTemplateImageLabel(file.name);
            setError('');
        };
        reader.onerror = () => {
            setError('Failed to read the selected image.');
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSenderProfile = () => {
        setError('');
        setFeedback('');

        startTransition(async () => {
            const result = await saveMailSenderProfile({
                mailFromName,
                mailFromCompany,
                mailAddressLine1,
                mailAddressLine2,
                mailCity,
                mailState,
                mailZip,
            });

            if (!result.success) {
                setError(result.error || 'Failed to save sender profile.');
                return;
            }

            setFeedback('Sender profile saved.');
            router.refresh();
        });
    };

    const handleSendExistingCampaign = (campaignId: string) => {
        setError('');
        setFeedback('');

        if (!senderProfileComplete) {
            setError('Complete your sender profile before sending mail.');
            return;
        }

        startTransition(async () => {
            if (mailMode === 'live') {
                const result = await createDirectMailCheckoutSession(campaignId);
                if (!result.success || !result.url) {
                    setError(result.error || 'Failed to create direct mail checkout.');
                    return;
                }

                window.location.href = result.url;
                return;
            } else {
                const result = await sendMailCampaign(campaignId);
                if (!result.success) {
                    setError(result.error || 'Failed to send campaign.');
                    return;
                }

                setFeedback(result.message || 'Campaign processed.');
            }
        });
    };

    const buildCardBackgroundStyle = (template: TemplateRecord | null) => {
        if (!template) {
            return { backgroundColor: '#2563EB' };
        }

        if (!template.imageUrl) {
            return { backgroundColor: template.accentColor };
        }

        return {
            backgroundColor: template.accentColor,
            backgroundImage: `linear-gradient(rgba(15,23,42,0.42), rgba(15,23,42,0.42)), url(${template.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        } as const;
    };

    const handleCancelCampaign = (campaignId: string) => {
        setError('');
        setFeedback('');

        startTransition(async () => {
            const result = await cancelMailCampaign(campaignId);
            if (!result.success) {
                setError(result.error || 'Failed to cancel campaign.');
                return;
            }

            setFeedback('Campaign cancelled.');
            router.refresh();
        });
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] px-4 py-6 text-gray-100 md:p-8">
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Direct Mail</h1>
                    <p className="mt-2 max-w-2xl text-sm font-light text-gray-400">
                        Turn scraped leads into physical postcards with saved templates, address checks, and campaign tracking.
                    </p>
                </div>
                <div className="flex flex-col items-start gap-2 lg:items-end">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${mailMode === 'live' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'}`}>
                        <Sparkles className="h-4 w-4" />
                        {mailMode === 'live'
                            ? lobEnvironment === 'test'
                                ? 'Lob test mode enabled'
                                : 'Lob live mode enabled'
                            : 'Demo mode: Lob API key not configured'}
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${senderProfileComplete ? 'border-blue-500/20 bg-blue-500/10 text-blue-200' : 'border-red-500/20 bg-red-500/10 text-red-200'}`}>
                        {senderProfileComplete ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {senderProfileComplete ? 'Sender profile configured' : 'Sender profile required before sending'}
                    </div>
                </div>
            </div>

            {(feedback || error) && (
                <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'}`}>
                    <div className="flex items-start gap-2">
                        {error ? <AlertCircle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
                        <span>{error || feedback}</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
                <div className="space-y-8">
                    <Card className="border-white/5 bg-[#111] shadow-md">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="text-lg font-semibold text-white">Sender Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <input value={mailFromName} onChange={(event) => setMailFromName(event.target.value)} placeholder="Sender name" className="rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                                <input value={mailFromCompany} onChange={(event) => setMailFromCompany(event.target.value)} placeholder="Company name" className="rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                            </div>
                            <input value={mailAddressLine1} onChange={(event) => setMailAddressLine1(event.target.value)} placeholder="Address line 1" className="w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                            <input value={mailAddressLine2} onChange={(event) => setMailAddressLine2(event.target.value)} placeholder="Address line 2 (optional)" className="w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <input value={mailCity} onChange={(event) => setMailCity(event.target.value)} placeholder="City" className="rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                                <input value={mailState} onChange={(event) => setMailState(event.target.value.toUpperCase())} placeholder="State" maxLength={2} className="rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                                <input value={mailZip} onChange={(event) => setMailZip(event.target.value)} placeholder="ZIP" className="rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                            </div>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <p className="text-xs text-gray-500">
                                    This address is used as the sender and return address for this organization’s mail campaigns.
                                </p>
                                <button
                                    onClick={handleSaveSenderProfile}
                                    disabled={isPending}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#171717] px-4 py-3 font-semibold text-gray-100 transition-all hover:bg-[#1C1C1C] disabled:opacity-50"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Save Sender Profile
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-white/5 bg-[#111] shadow-md">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                                <Mail className="h-4 w-4 text-blue-400" />
                                Campaign Builder
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Campaign Name</label>
                                    <input
                                        value={campaignName}
                                        onChange={(event) => setCampaignName(event.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none transition-all focus:border-blue-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Postage Class</label>
                                    <select
                                        value={effectivePostageClass}
                                        onChange={(event) => setPostageClass(event.target.value as 'MARKETING' | 'FIRST_CLASS')}
                                        disabled={selectedTemplate?.size === '4X6'}
                                        className="w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none transition-all focus:border-blue-500/50"
                                    >
                                        <option value="MARKETING">Marketing Mail</option>
                                        <option value="FIRST_CLASS">First Class</option>
                                    </select>
                                    {selectedTemplate?.size === '4X6' && (
                                        <p className="mt-2 text-xs text-gray-500">
                                            Lob requires 4x6 postcards to use First Class mail.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Choose Template</label>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {templates.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => setSelectedTemplateId(template.id)}
                                            className={`rounded-2xl border p-4 text-left transition-all ${selectedTemplateId === template.id ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/10 bg-[#171717] hover:border-white/20'}`}
                                        >
                                            <div className="mb-3 flex items-center justify-between">
                                                <div className="text-sm font-semibold text-white">{template.name}</div>
                                                <div className="rounded-full border border-white/10 bg-[#111] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">
                                                    {template.size}
                                                </div>
                                            </div>
                                            <div
                                                className="rounded-xl p-4 text-white"
                                                style={buildCardBackgroundStyle(template)}
                                            >
                                                <div className="text-xs uppercase tracking-[0.18em] opacity-80">Front</div>
                                                <div className="mt-2 text-lg font-bold leading-tight">{template.frontHeadline}</div>
                                                <div className="mt-2 text-sm opacity-90">{template.frontBody}</div>
                                            </div>
                                            {template.imageUrl && (
                                                <div className="mt-2 text-[11px] text-gray-500">Background image enabled</div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-[#161616] p-5">
                                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-white">Lead Selection</div>
                                        <div className="mt-1 text-xs text-gray-500">Select leads with valid mailing addresses.</div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={selectAllVisible} className="rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#1B1B1B]">
                                            Select Visible
                                        </button>
                                        <button onClick={clearSelection} className="rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#1B1B1B]">
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search leads or addresses"
                                        className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50"
                                    />
                                    <select
                                        value={sourceFilter}
                                        onChange={(event) => setSourceFilter(event.target.value)}
                                        className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50"
                                    >
                                        <option value="ALL">All sources</option>
                                        <option value="SCRAPER">Scraper</option>
                                        <option value="BUSINESS_SCRAPER">Business Finder</option>
                                        <option value="MANUAL">Manual</option>
                                    </select>
                                    <select
                                        value={statusFilter}
                                        onChange={(event) => setStatusFilter(event.target.value)}
                                        className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50"
                                    >
                                        <option value="ALL">All statuses</option>
                                        <option value="NEW">New</option>
                                        <option value="CONTACTED">Contacted</option>
                                        <option value="QUOTED">Quoted</option>
                                        <option value="WON">Won</option>
                                        <option value="LOST">Lost</option>
                                    </select>
                                </div>

                                <div className="max-h-[360px] overflow-y-auto rounded-2xl border border-white/5">
                                    {filteredLeads.map((lead) => {
                                        const isSelected = selectedLeadIds.includes(lead.id);
                                        return (
                                            <button
                                                key={lead.id}
                                                onClick={() => toggleLead(lead.id)}
                                                className={`flex w-full items-start justify-between gap-4 border-b border-white/5 px-4 py-4 text-left transition-all last:border-b-0 ${isSelected ? 'bg-blue-500/10' : 'bg-[#111] hover:bg-[#151515]'}`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-white">{lead.name}</div>
                                                    <div className="mt-1 text-sm text-gray-400">{lead.address}</div>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <span className="rounded-full border border-white/10 bg-[#171717] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">{lead.source}</span>
                                                        <span className="rounded-full border border-white/10 bg-[#171717] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">{lead.status}</span>
                                                    </div>
                                                </div>
                                                <div className={`mt-1 h-5 w-5 shrink-0 rounded border ${isSelected ? 'border-blue-400 bg-blue-500' : 'border-white/20 bg-transparent'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 md:flex-row">
                                <button
                                    disabled={isPending || !selectedTemplateId || selectedLeadIds.length === 0}
                                    onClick={() => handleCreateCampaign(false)}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#171717] px-4 py-3 font-semibold text-gray-200 transition-all hover:bg-[#1C1C1C] disabled:opacity-50"
                                >
                                    <Mail className="h-4 w-4" />
                                    Save Draft
                                </button>
                                <button
                                    disabled={isPending || !selectedTemplateId || selectedLeadIds.length === 0}
                                    onClick={() => handleCreateCampaign(true)}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-500 disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" />
                                    {mailMode === 'live' ? 'Checkout & Send' : 'Create & Run Demo'}
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-white/5 bg-[#111] shadow-md">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="text-lg font-semibold text-white">Create a Custom Template</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <input value={newTemplateName} onChange={(event) => setNewTemplateName(event.target.value)} placeholder="Template name" className="rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                                <input value={newTemplateAccent} onChange={(event) => setNewTemplateAccent(event.target.value)} placeholder="#2563EB" className="rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-[#171717] p-4">
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                    Front Background Image
                                </label>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    onChange={handleTemplateImageUpload}
                                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-[#111] px-3 py-2 text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-500"
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    Upload a front-side postcard image (max 8MB).
                                </p>
                                {newTemplateImageLabel && (
                                    <div className="mt-2 text-xs text-gray-400">
                                        Selected file: <span className="text-gray-200">{newTemplateImageLabel}</span>
                                    </div>
                                )}
                                <div className="mt-3">
                                    <input
                                        value={newTemplateImageUrl.startsWith('http') ? newTemplateImageUrl : ''}
                                        onChange={(event) => {
                                            setNewTemplateImageUrl(event.target.value.trim());
                                            setNewTemplateImageLabel('');
                                        }}
                                        placeholder="Or paste background image URL (optional)"
                                        className="w-full rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none focus:border-blue-500/50"
                                    />
                                </div>
                            </div>
                            {newTemplateImageUrl && (
                                <div className="rounded-2xl border border-white/10 bg-[#171717] p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Front Preview</div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openFullPreview(draftTemplateForPreview, 'front')}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
                                            >
                                                <Maximize2 className="h-3.5 w-3.5" />
                                                Full Size
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewTemplateImageUrl('');
                                                    setNewTemplateImageLabel('');
                                                }}
                                                className="rounded-lg border border-white/10 bg-[#111] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#1B1B1B]"
                                            >
                                                Remove Image
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        className="rounded-xl p-5 text-white"
                                        style={{
                                            backgroundColor: newTemplateAccent || '#2563EB',
                                            backgroundImage: `linear-gradient(rgba(15,23,42,0.42), rgba(15,23,42,0.42)), url(${newTemplateImageUrl})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                        }}
                                    >
                                        <div className="text-[10px] uppercase tracking-[0.24em] opacity-80">Front</div>
                                        <div className="mt-3 text-xl font-bold leading-tight">
                                            {newTemplateFrontHeadline || 'Front headline preview'}
                                        </div>
                                        <p className="mt-3 text-sm leading-7 opacity-90">
                                            {newTemplateFrontBody || 'Front body preview text appears here.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <input value={newTemplateFrontHeadline} onChange={(event) => setNewTemplateFrontHeadline(event.target.value)} placeholder="Front headline" className="w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                            <textarea value={newTemplateFrontBody} onChange={(event) => setNewTemplateFrontBody(event.target.value)} placeholder="Front body copy" rows={3} className="w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                            <input value={newTemplateBackHeadline} onChange={(event) => setNewTemplateBackHeadline(event.target.value)} placeholder="Back headline" className="w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                            <textarea value={newTemplateBackBody} onChange={(event) => setNewTemplateBackBody(event.target.value)} placeholder="Back body copy" rows={4} className="w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                            <input value={newTemplateCta} onChange={(event) => setNewTemplateCta(event.target.value)} placeholder="CTA text" className="w-full rounded-xl border border-white/10 bg-[#171717] px-4 py-3 text-white outline-none focus:border-blue-500/50" />
                            <button
                                onClick={handleCreateTemplate}
                                disabled={isPending || !newTemplateName || !newTemplateFrontHeadline || !newTemplateFrontBody || !newTemplateBackBody}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#171717] px-4 py-3 font-semibold text-gray-100 transition-all hover:bg-[#1C1C1C] disabled:opacity-50"
                            >
                                <Sparkles className="h-4 w-4" />
                                Save Template
                            </button>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card className="border-white/5 bg-[#111] shadow-md">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-lg font-semibold text-white">Campaign Preview</CardTitle>
                                {selectedTemplate && (
                                    <button
                                        type="button"
                                        onClick={() => openFullPreview(selectedTemplate, 'front')}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
                                    >
                                        <Maximize2 className="h-3.5 w-3.5" />
                                        Full Size
                                    </button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            <div className="rounded-2xl border border-white/5 bg-[#161616] p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="text-sm font-semibold text-white">{selectedTemplate?.name || 'Select a template'}</div>
                                    <div className="rounded-full border border-white/10 bg-[#111] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">
                                        {selectedTemplate?.size || '4X6'}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-2xl p-5 text-white" style={buildCardBackgroundStyle(selectedTemplate)}>
                                        <div className="text-[10px] uppercase tracking-[0.24em] opacity-80">Front</div>
                                        <div className="mt-3 text-2xl font-bold leading-tight">
                                            {applyMergeTags(selectedTemplate?.frontHeadline, previewLead)}
                                        </div>
                                        <p className="mt-3 text-sm leading-7 opacity-90">
                                            {applyMergeTags(selectedTemplate?.frontBody, previewLead)}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-white/5 p-5 text-white" style={{ backgroundColor: '#0F172A' }}>
                                        <div className="text-[10px] uppercase tracking-[0.24em] text-blue-300">Back</div>
                                        {selectedTemplate?.backHeadline && (
                                            <div className="mt-3 text-xl font-semibold leading-tight">
                                                {applyMergeTags(selectedTemplate.backHeadline, previewLead)}
                                            </div>
                                        )}
                                        <p className="mt-3 text-sm leading-7 text-gray-200">
                                            {applyMergeTags(selectedTemplate?.backBody, previewLead)}
                                        </p>
                                        {selectedTemplate?.ctaText && (
                                            <div className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                                                {applyMergeTags(selectedTemplate.ctaText, previewLead)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/5 bg-[#161616] p-5">
                                <div className="text-sm font-semibold text-white">Current selection</div>
                                <div className="mt-4 space-y-3 text-sm text-gray-300">
                                    <div className="flex items-center justify-between">
                                        <span>Selected leads</span>
                                        <span className="font-semibold text-white">{selectedLeadIds.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Estimated customer charge</span>
                                        <span className="font-semibold text-white">{formatUsd(estimatedCost)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Mail mode</span>
                                        <span className="font-semibold text-white">{mailMode === 'live' ? 'Live Lob dispatch' : 'Demo processing'}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-white/5 bg-[#111] shadow-md">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <CardTitle className="text-lg font-semibold text-white">Recent Campaigns</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {campaigns.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-[#161616] px-4 py-8 text-center text-sm text-gray-500">
                                    No campaigns yet. Create your first postcard drop from the builder.
                                </div>
                            )}

                            {campaigns.map((campaign) => (
                                <div key={campaign.id} className="rounded-2xl border border-white/5 bg-[#161616] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-white">{campaign.name}</div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {campaign.template.name} • {campaign.template.size} • {new Date(campaign.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="rounded-full border border-white/10 bg-[#111] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-gray-300">
                                            {campaign.status}
                                        </div>
                                    </div>

                                    {campaign.stripePaymentStatus && (
                                        <div className="mt-3 rounded-full border border-white/10 bg-[#111] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-gray-400 inline-flex">
                                            Payment: {campaign.stripePaymentStatus}
                                        </div>
                                    )}

                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-300">
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Cost</div>
                                            <div className="mt-1 font-semibold text-white">{formatUsd(campaign.costCents)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Orders</div>
                                            <div className="mt-1 font-semibold text-white">{campaign.orderCount}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Sent</div>
                                            <div className="mt-1 font-semibold text-white">{campaign.sentCount}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Failed</div>
                                            <div className="mt-1 font-semibold text-white">{campaign.failedCount}</div>
                                        </div>
                                    </div>

                                    {campaign.recentLobIds.length > 0 && (
                                        <div className="mt-4 rounded-xl border border-white/5 bg-[#111] p-3">
                                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Recent Lob IDs</div>
                                            <div className="mt-2 space-y-1">
                                                {campaign.recentLobIds.map((lobId) => (
                                                    <div key={lobId} className="truncate font-mono text-xs text-blue-300">
                                                        {lobId}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 flex flex-col gap-2">
                                        {campaign.status !== 'COMPLETED' && campaign.status !== 'CANCELLED' && (
                                            <button
                                                onClick={() => handleSendExistingCampaign(campaign.id)}
                                                disabled={isPending || !senderProfileComplete}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
                                            >
                                                <Send className="h-4 w-4" />
                                                {mailMode === 'live' ? 'Checkout & Send' : 'Run Demo'}
                                            </button>
                                        )}
                                        {campaign.status !== 'CANCELLED' && campaign.status !== 'COMPLETED' && (
                                            <button
                                                onClick={() => handleCancelCampaign(campaign.id)}
                                                disabled={isPending}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/20 disabled:opacity-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {fullPreviewTemplate && (
                <div className="fixed inset-0 z-[70] bg-black/80 p-4 backdrop-blur-sm md:p-8">
                    <div className="mx-auto flex h-full max-w-6xl flex-col rounded-2xl border border-white/10 bg-[#101010] shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                            <div>
                                <div className="text-sm font-semibold text-white">{fullPreviewTemplate.name}</div>
                                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-500">{fullPreviewTemplate.size} Postcard Preview</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFullPreviewSide('front')}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all ${fullPreviewSide === 'front' ? 'bg-white text-black' : 'bg-[#171717] text-gray-300 hover:bg-[#1B1B1B]'}`}
                                >
                                    Front
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFullPreviewSide('back')}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all ${fullPreviewSide === 'back' ? 'bg-white text-black' : 'bg-[#171717] text-gray-300 hover:bg-[#1B1B1B]'}`}
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFullPreviewTemplate(null)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#171717] px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#1B1B1B]"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8">
                            <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0B0B0B] p-4 md:p-6">
                                <div
                                    className="aspect-[3/2] w-full rounded-2xl p-6 text-white md:p-10"
                                    style={fullPreviewSide === 'front'
                                        ? fullPreviewTemplate.imageUrl
                                            ? {
                                                backgroundColor: fullPreviewTemplate.accentColor || '#2563EB',
                                                backgroundImage: `linear-gradient(rgba(15,23,42,0.42), rgba(15,23,42,0.42)), url(${fullPreviewTemplate.imageUrl})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }
                                            : { backgroundColor: fullPreviewTemplate.accentColor || '#2563EB' }
                                        : { backgroundColor: '#0F172A' }}
                                >
                                    {fullPreviewSide === 'front' ? (
                                        <div className="flex h-full flex-col justify-between">
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.24em] opacity-80">Front</div>
                                                <div className="mt-4 text-3xl font-bold leading-tight md:text-5xl">
                                                    {applyMergeTags(fullPreviewTemplate.frontHeadline, previewLead)}
                                                </div>
                                                <p className="mt-4 max-w-4xl text-base leading-8 opacity-95 md:text-xl md:leading-9">
                                                    {applyMergeTags(fullPreviewTemplate.frontBody, previewLead)}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex h-full flex-col justify-between">
                                            <div>
                                                <div className="text-[10px] uppercase tracking-[0.24em] text-blue-300">Back</div>
                                                {fullPreviewTemplate.backHeadline && (
                                                    <div className="mt-4 text-2xl font-semibold leading-tight md:text-4xl">
                                                        {applyMergeTags(fullPreviewTemplate.backHeadline, previewLead)}
                                                    </div>
                                                )}
                                                <p className="mt-4 max-w-4xl text-base leading-8 text-gray-200 md:text-xl md:leading-9">
                                                    {applyMergeTags(fullPreviewTemplate.backBody, previewLead)}
                                                </p>
                                            </div>
                                            {fullPreviewTemplate.ctaText && (
                                                <div className="inline-flex w-fit rounded-full bg-white px-5 py-3 text-sm font-semibold text-black md:text-base">
                                                    {applyMergeTags(fullPreviewTemplate.ctaText, previewLead)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
