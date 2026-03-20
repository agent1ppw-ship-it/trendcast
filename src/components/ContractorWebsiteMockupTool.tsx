'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ArrowRight, Building2, MonitorSmartphone, RefreshCcw, Wand2 } from 'lucide-react';

type IndustryPreset = {
    heroTopic: string;
    services: string[];
    trustPoints: string[];
    cta: string;
};

const INDUSTRY_PRESETS: Record<string, IndustryPreset> = {
    Landscaping: {
        heroTopic: 'landscape installs, lawn upgrades, and outdoor curb appeal',
        services: ['Landscape Design', 'Mulch & Rock Beds', 'New Lawn Installation'],
        trustPoints: ['Locally trusted crews', 'Fast quote follow-up', 'Built for photo-driven work'],
        cta: 'Request a landscape quote',
    },
    'Power Washing': {
        heroTopic: 'house washing, concrete cleaning, and exterior restoration',
        services: ['House Washing', 'Driveway Cleaning', 'Fence & Deck Washing'],
        trustPoints: ['Click-to-call mobile CTA', 'Service-area SEO blocks', 'Before/after portfolio layout'],
        cta: 'Get a washing estimate',
    },
    Roofing: {
        heroTopic: 'roof replacements, storm repair, and inspection-driven leads',
        services: ['Roof Replacement', 'Storm Damage Repair', 'Roof Inspections'],
        trustPoints: ['Trust badge sections', 'Insurance-focused messaging', 'Quote-first mobile layout'],
        cta: 'Book a roof inspection',
    },
    'Tree Service': {
        heroTopic: 'tree removal, trimming, and emergency storm cleanup',
        services: ['Tree Removal', 'Tree Trimming', 'Storm Cleanup'],
        trustPoints: ['Emergency-call CTA', 'Service proof sections', 'Local-intent SEO headings'],
        cta: 'Request tree service',
    },
    Concrete: {
        heroTopic: 'driveways, patios, flatwork, and decorative concrete jobs',
        services: ['Driveways', 'Patios & Walkways', 'Stamped Concrete'],
        trustPoints: ['High-ticket project positioning', 'Gallery-first layout', 'Estimate form above the fold'],
        cta: 'Get a concrete estimate',
    },
    Drywall: {
        heroTopic: 'drywall install, patching, texture, and finish work',
        services: ['Drywall Installation', 'Drywall Repair', 'Texture Matching'],
        trustPoints: ['Clean service breakdowns', 'Trust-building copy blocks', 'Lead form for renovation requests'],
        cta: 'Request a drywall quote',
    },
    'Dumpster Rental': {
        heroTopic: 'roll-off dumpster rentals for cleanup, remodels, and jobsites',
        services: ['10 Yard Dumpsters', '20 Yard Dumpsters', 'Contractor Drop-Offs'],
        trustPoints: ['Fast conversion layout', 'Phone-first mobile design', 'Simple service-area messaging'],
        cta: 'Reserve a dumpster',
    },
    default: {
        heroTopic: 'local service leads, trust, and quote-ready traffic',
        services: ['Primary Service', 'Secondary Service', 'Featured Project Type'],
        trustPoints: ['Mobile-first layout', 'Local SEO-ready structure', 'Quote-focused calls to action'],
        cta: 'Request a quote',
    },
};

const INDUSTRY_OPTIONS = Object.keys(INDUSTRY_PRESETS).filter((key) => key !== 'default');

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function pickPreset(industry: string) {
    return INDUSTRY_PRESETS[industry] || INDUSTRY_PRESETS.default;
}

function buildAccentColor(seed: string) {
    const palette = ['#f97316', '#22c55e', '#06b6d4', '#3b82f6', '#eab308', '#ef4444'];
    const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palette[total % palette.length];
}

export function ContractorWebsiteMockupTool() {
    const [draftCompanyName, setDraftCompanyName] = useState('North Ridge Landscaping');
    const [draftIndustry, setDraftIndustry] = useState('Landscaping');
    const [draftCityState, setDraftCityState] = useState('Wausau, WI');
    const [draftTagline, setDraftTagline] = useState('Outdoor spaces built to stand out.');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [companyName, setCompanyName] = useState('North Ridge Landscaping');
    const [industry, setIndustry] = useState('Landscaping');
    const [cityState, setCityState] = useState('Wausau, WI');
    const [tagline, setTagline] = useState('Outdoor spaces built to stand out.');
    const [previewVersion, setPreviewVersion] = useState(0);

    const preset = useMemo(() => pickPreset(industry), [industry]);
    const accentColor = useMemo(() => buildAccentColor(`${companyName}-${industry}`), [companyName, industry]);
    const websiteSlug = useMemo(() => `${slugify(companyName || 'your-company')}.com`, [companyName]);

    async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setLogoPreview(typeof reader.result === 'string' ? reader.result : null);
        };
        reader.readAsDataURL(file);
    }

    function handleGenerate() {
        setCompanyName(draftCompanyName.trim() || 'Your Company');
        setIndustry(draftIndustry);
        setCityState(draftCityState.trim() || 'Your Service Area');
        setTagline(draftTagline.trim() || 'A local contractor site built to win more calls.');
        setPreviewVersion((current) => current + 1);
    }

    function handleReset() {
        setDraftCompanyName('North Ridge Landscaping');
        setDraftIndustry('Landscaping');
        setDraftCityState('Wausau, WI');
        setDraftTagline('Outdoor spaces built to stand out.');
        setCompanyName('North Ridge Landscaping');
        setIndustry('Landscaping');
        setCityState('Wausau, WI');
        setTagline('Outdoor spaces built to stand out.');
        setLogoPreview(null);
        setPreviewVersion((current) => current + 1);
    }

    return (
        <section className="border-y border-white/6 bg-[linear-gradient(180deg,#08090c_0%,#0a0d11_100%)]">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr]">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Demo site tool</p>
                        <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                            Generate a contractor website mockup in seconds.
                        </h2>
                        <p className="mt-5 text-base leading-8 text-gray-300">
                            Drop in a company name and logo, choose the trade, and instantly show a contractor what their Trendcast site could look like.
                        </p>

                        <div className="mt-8 rounded-[2rem] border border-white/8 bg-[linear-gradient(160deg,rgba(16,19,25,0.96),rgba(9,11,16,0.92))] p-6">
                            <div className="grid gap-4">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-gray-200">Company Name</span>
                                    <input
                                        value={draftCompanyName}
                                        onChange={(event) => setDraftCompanyName(event.target.value)}
                                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-cyan-300/50"
                                        placeholder="North Ridge Landscaping"
                                    />
                                </label>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-semibold text-gray-200">Industry</span>
                                        <select
                                            value={draftIndustry}
                                            onChange={(event) => setDraftIndustry(event.target.value)}
                                            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-cyan-300/50"
                                        >
                                            {INDUSTRY_OPTIONS.map((option) => (
                                                <option key={option} value={option} className="bg-[#0b1016]">
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-semibold text-gray-200">City / State</span>
                                        <input
                                            value={draftCityState}
                                            onChange={(event) => setDraftCityState(event.target.value)}
                                            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-cyan-300/50"
                                            placeholder="Wausau, WI"
                                        />
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-gray-200">Tagline</span>
                                    <input
                                        value={draftTagline}
                                        onChange={(event) => setDraftTagline(event.target.value)}
                                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-cyan-300/50"
                                        placeholder="Outdoor spaces built to stand out."
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-gray-200">Logo Upload</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="w-full rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm text-gray-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400/15 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cyan-200"
                                    />
                                </label>

                                <div className="flex flex-wrap gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleGenerate}
                                        className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-extrabold text-black transition-colors hover:bg-cyan-300"
                                    >
                                        <Wand2 className="h-4 w-4" />
                                        Generate Demo Mockup
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10"
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">Live preview</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">Branded contractor mockup</h3>
                            </div>
                            <a
                                href="#website-build-inquiry"
                                className="inline-flex items-center gap-2 rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-200 transition-colors hover:bg-orange-500/15"
                            >
                                Use This For Inquiry
                                <ArrowRight className="h-4 w-4" />
                            </a>
                        </div>

                        <div key={previewVersion} className="grid gap-5 xl:grid-cols-[1fr_260px]">
                            <div className="overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(160deg,rgba(12,15,21,0.98),rgba(8,10,15,0.96))] shadow-[0_0_70px_rgba(34,211,238,0.08)]">
                                <div className="border-b border-white/8 bg-[#0c1118] px-5 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                                        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                                        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                                        <div className="ml-4 rounded-full border border-white/8 bg-white/[0.04] px-4 py-1 text-xs text-gray-400">
                                            {websiteSlug}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-7 sm:p-8">
                                    <div className="flex flex-wrap items-center justify-between gap-5">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04]"
                                                style={{ boxShadow: `0 0 28px ${accentColor}33` }}
                                            >
                                                {logoPreview ? (
                                                    <Image src={logoPreview} alt={`${companyName} logo`} width={64} height={64} className="h-full w-full object-contain p-2" />
                                                ) : (
                                                    <Building2 className="h-7 w-7" style={{ color: accentColor }} />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-white">{companyName}</div>
                                                <div className="text-sm text-gray-400">{industry} • {cityState}</div>
                                            </div>
                                        </div>
                                        <div className="hidden gap-3 text-sm text-gray-300 md:flex">
                                            <span>Services</span>
                                            <span>Portfolio</span>
                                            <span>Reviews</span>
                                            <span>Contact</span>
                                        </div>
                                    </div>

                                    <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                                        <div>
                                            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-300">
                                                SEO-ready local portfolio site
                                            </div>
                                            <h4 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white">
                                                {companyName} for {preset.heroTopic}.
                                            </h4>
                                            <p className="mt-5 max-w-xl text-base leading-8 text-gray-300">
                                                {tagline} Built to convert local search traffic into calls, quote requests, and booked jobs in {cityState}.
                                            </p>

                                            <div className="mt-8 flex flex-wrap gap-3">
                                                <button
                                                    type="button"
                                                    className="rounded-2xl px-5 py-3 text-sm font-extrabold text-white"
                                                    style={{ backgroundColor: accentColor }}
                                                >
                                                    {preset.cta}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-2xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-100"
                                                >
                                                    View recent work
                                                </button>
                                            </div>
                                        </div>

                                        <div className="rounded-[1.75rem] border border-white/8 bg-[linear-gradient(155deg,rgba(18,22,30,0.96),rgba(11,14,20,0.94))] p-5">
                                            <div className="grid gap-3">
                                                {preset.services.map((service) => (
                                                    <div key={service} className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
                                                        <div className="text-sm font-semibold text-white">{service}</div>
                                                        <div className="mt-2 text-xs leading-6 text-gray-400">
                                                            Service section with strong CTA, local credibility, and mobile quote intent.
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                                        {preset.trustPoints.map((point) => (
                                            <div key={point} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-gray-200">
                                                {point}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mx-auto w-full max-w-[260px] rounded-[2.25rem] border border-white/8 bg-[#0b0f16] p-3 shadow-[0_0_45px_rgba(0,0,0,0.42)]">
                                <div className="overflow-hidden rounded-[1.85rem] border border-white/8 bg-[linear-gradient(180deg,#0d1118_0%,#090c12_100%)]">
                                    <div className="px-5 pb-6 pt-5">
                                        <div className="mb-6 flex items-center justify-between">
                                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{companyName}</div>
                                            <MonitorSmartphone className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <div
                                            className="inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
                                            style={{ backgroundColor: `${accentColor}33` }}
                                        >
                                            {cityState}
                                        </div>
                                        <h4 className="mt-4 text-2xl font-extrabold leading-tight text-white">{companyName}</h4>
                                        <p className="mt-3 text-sm leading-6 text-gray-300">{tagline}</p>
                                        <button
                                            type="button"
                                            className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-extrabold text-white"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            {preset.cta}
                                        </button>
                                        <div className="mt-6 space-y-3">
                                            {preset.services.slice(0, 2).map((service) => (
                                                <div key={service} className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3">
                                                    <div className="text-sm font-semibold text-white">{service}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
