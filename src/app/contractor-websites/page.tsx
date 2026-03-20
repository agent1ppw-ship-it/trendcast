import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, CheckCircle2, Globe2, MonitorSmartphone, Search, Sparkles } from 'lucide-react';
import { ContractorWebsiteMockupTool } from '@/components/ContractorWebsiteMockupTool';
import { WebsiteBuildInquiryForm } from '@/components/WebsiteBuildInquiryForm';

export const metadata: Metadata = {
    title: '$399 Contractor Website Builds',
    description: 'Mobile-optimized, SEO-ready portfolio websites for landscapers, roofers, power washing companies, tree services, concrete contractors, drywall companies, dumpster rentals, and other home service businesses.',
    keywords: [
        'contractor website design',
        'website builds for contractors',
        'home service website design',
        'landscaping website design',
        'power washing website design',
        'roofing website design',
        'tree service website design',
        'concrete contractor websites',
        'drywall company websites',
        'dumpster rental websites',
        'SEO ready contractor websites',
        'mobile optimized contractor websites',
    ],
    alternates: {
        canonical: '/contractor-websites',
    },
    openGraph: {
        title: '$399 Contractor Website Builds | Trendcast.io',
        description: 'Done-for-you contractor websites built to look sharp on mobile, rank locally, and turn visitors into estimate requests.',
        type: 'website',
        url: 'https://trendcast.io/contractor-websites',
    },
};

const industries = [
    'Landscaping',
    'Power Washing',
    'Roofing',
    'Tree Service',
    'Concrete',
    'Drywall',
    'Dumpster Rental',
    'Pressure Washing',
    'Deck Builders',
    'Fencing',
    'Excavation',
    'Home Remodeling',
];

const deliverables = [
    'Conversion-focused homepage + service sections',
    'Mobile-optimized layout that looks sharp on iPhone and Android',
    'Local SEO-ready page structure, metadata, and copy blocks',
    'Lead form, click-to-call actions, and quote-focused CTAs',
    'Portfolio gallery, before/after sections, and trust badges',
    'Google indexing setup and launch-ready technical basics',
];

const faqItems = [
    {
        question: 'What kind of contractor sites are included?',
        answer: 'This offer is designed for local home service contractors like landscapers, pressure washers, roofers, tree services, concrete crews, drywall companies, dumpster rentals, and similar trades.',
    },
    {
        question: 'Is this mobile optimized?',
        answer: 'Yes. The sites are designed to look clean and intentional on mobile first, because that is where most estimate requests start.',
    },
    {
        question: 'Is the site SEO ready?',
        answer: 'Yes. The build is structured for local SEO with strong headings, crawlable content, metadata, internal sections, and launch-ready indexing basics.',
    },
    {
        question: 'Do I own the website?',
        answer: 'Yes. This is positioned as a straightforward build for your business, not a locked-in template subscription.',
    },
];

export default function ContractorWebsitesPage() {
    return (
        <div className="min-h-screen bg-[#060607] text-white">
            <section className="relative overflow-hidden border-b border-white/6 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.14),transparent_34%),radial-gradient(circle_at_75%_20%,rgba(34,211,238,0.10),transparent_32%),linear-gradient(180deg,#0a0b0d_0%,#060607_72%)]">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-overlay" />
                <div className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pb-28 lg:pt-32">
                    <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200">
                                <Sparkles className="h-4 w-4" />
                                New Offer
                            </div>
                            <h1 className="mt-7 max-w-5xl text-5xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                The <span className="text-orange-400">$399</span> contractor website build that looks sharp and gets calls.
                            </h1>
                            <p className="mt-7 max-w-3xl text-lg leading-8 text-gray-300 sm:text-xl">
                                Done-for-you portfolio websites for local home service contractors. Mobile optimized, SEO ready, fast to launch, and built around the way real homeowners search for landscapers, roofers, concrete crews, tree services, power washing companies, and more.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-200">
                                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Flat $399 build</div>
                                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Mobile optimized</div>
                                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">SEO ready</div>
                                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Built for local trades</div>
                            </div>

                            <div className="mt-10 flex flex-wrap gap-4">
                                <a
                                    href="#website-build-inquiry"
                                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-extrabold text-white transition-all hover:bg-orange-400"
                                >
                                    Start My Website Build
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                                <Link
                                    href="/#pricing"
                                    className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-6 py-4 text-sm font-semibold text-gray-100 transition-all hover:bg-white/10"
                                >
                                    Compare Trendcast Offers
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(155deg,rgba(20,17,14,0.96),rgba(9,12,18,0.94))] p-6 shadow-[0_0_70px_rgba(249,115,22,0.10)]">
                            <div className="rounded-[1.5rem] border border-white/8 bg-[#0f1217] p-5">
                                <div className="mb-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300">Launch Package</p>
                                        <h2 className="mt-2 text-3xl font-bold text-white">$399</h2>
                                    </div>
                                    <div className="rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-200">
                                        Local contractor sites
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {deliverables.slice(0, 4).map((item) => (
                                        <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
                                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-orange-400" />
                                            <span className="text-sm leading-6 text-gray-200">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <ContractorWebsiteMockupTool />

            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="rounded-3xl border border-white/8 bg-[linear-gradient(160deg,rgba(16,18,23,0.96),rgba(8,10,14,0.92))] p-7">
                        <MonitorSmartphone className="h-10 w-10 text-orange-400" />
                        <h2 className="mt-5 text-2xl font-bold text-white">Built for the phone first</h2>
                        <p className="mt-3 text-sm leading-7 text-gray-400">
                            Most contractor traffic lands on mobile. These sites are designed to look clean, load quickly, and push users into calling or requesting a quote.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-white/8 bg-[linear-gradient(160deg,rgba(15,18,25,0.96),rgba(9,12,17,0.92))] p-7">
                        <Search className="h-10 w-10 text-cyan-300" />
                        <h2 className="mt-5 text-2xl font-bold text-white">Local SEO ready from day one</h2>
                        <p className="mt-3 text-sm leading-7 text-gray-400">
                            Clean hierarchy, service-focused copy structure, metadata, and local intent baked into the build so the site is ready to support search visibility.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-white/8 bg-[linear-gradient(160deg,rgba(18,17,12,0.96),rgba(10,10,12,0.92))] p-7">
                        <Globe2 className="h-10 w-10 text-emerald-300" />
                        <h2 className="mt-5 text-2xl font-bold text-white">Made for real home service brands</h2>
                        <p className="mt-3 text-sm leading-7 text-gray-400">
                            This is not a generic startup landing page. It is tailored to service businesses that need trust, proof, service clarity, and direct response.
                        </p>
                    </div>
                </div>
            </section>

            <section className="border-y border-white/6 bg-[#0a0b0d]">
                <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                    <div className="max-w-4xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300">Built for the trades</p>
                        <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                            Your industry. Our structure.
                        </h2>
                        <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-300">
                            Each site is shaped around how your customers search, compare, and request estimates. It works especially well for visually driven and trust-driven home service categories.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {industries.map((industry) => (
                            <div
                                key={industry}
                                className="rounded-2xl border border-white/8 bg-[linear-gradient(155deg,rgba(16,18,23,0.95),rgba(9,11,16,0.92))] px-5 py-5"
                            >
                                <div className="flex items-start gap-3">
                                    <BadgeCheck className="mt-0.5 h-5 w-5 text-orange-400" />
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{industry}</h3>
                                        <p className="mt-2 text-sm leading-6 text-gray-400">
                                            Built to showcase services, proof, and quote intent for local buyers.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">What is included</p>
                        <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-white">A clean local portfolio site, ready to work.</h2>
                        <p className="mt-5 text-base leading-8 text-gray-300">
                            The offer is intentionally simple. You get a focused site build that makes a contractor look established, credible, and easy to contact.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {deliverables.map((item) => (
                            <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
                                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                                <p className="mt-3 text-sm leading-7 text-gray-200">{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-y border-white/6 bg-[linear-gradient(180deg,#0b0c10_0%,#090a0d_100%)]">
                <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                    <div className="rounded-[2rem] border border-orange-400/18 bg-[linear-gradient(145deg,rgba(18,16,13,0.96),rgba(10,12,16,0.94))] p-8 shadow-[0_0_80px_rgba(249,115,22,0.08)] lg:p-10">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300">Offer summary</p>
                        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                            <div>
                                <h2 className="text-4xl font-extrabold tracking-tight text-white">$399 contractor website build</h2>
                                <p className="mt-3 max-w-2xl text-base leading-8 text-gray-300">
                                    For contractors who need a professional web presence without turning this into a giant custom-agency project.
                                </p>
                            </div>
                            <a
                                href="#website-build-inquiry"
                                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-extrabold text-white transition-all hover:bg-orange-400"
                            >
                                Claim This Offer
                                <ArrowRight className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">FAQ</p>
                    <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-white">Questions contractors usually ask first.</h2>
                </div>

                <div className="mt-10 space-y-4">
                    {faqItems.map((item) => (
                        <div key={item.question} className="rounded-2xl border border-white/8 bg-[linear-gradient(160deg,rgba(15,18,24,0.96),rgba(8,10,15,0.92))] px-6 py-6">
                            <h3 className="text-lg font-bold text-white">{item.question}</h3>
                            <p className="mt-3 text-sm leading-7 text-gray-400">{item.answer}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section id="website-build-inquiry" className="scroll-mt-28 border-t border-white/6 bg-[linear-gradient(180deg,#0a0b0d_0%,#07080b_100%)]">
                <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300">Lead capture</p>
                        <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-white">Request your website build.</h2>
                        <p className="mt-4 text-base leading-8 text-gray-300">
                            Fill this out and the inquiry will be captured inside Trendcast so it can be followed up like any other lead.
                        </p>
                    </div>

                    <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(155deg,rgba(18,16,13,0.96),rgba(10,12,16,0.94))] p-6 sm:p-8">
                        <WebsiteBuildInquiryForm />
                    </div>
                </div>
            </section>
        </div>
    );
}
