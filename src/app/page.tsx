'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Bot, PhoneCall, LineChart, CalendarCheck, ShieldCheck, Zap, Activity } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCheckoutSession } from '@/app/actions/billing';

export default function Home() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.5 }
  };

  const stagger = {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    viewport: { once: true },
    transition: { staggerChildren: 0.1 }
  };

  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleUpgrade = async (tier: 'INTRO' | 'PRO' | 'ULTIMATE') => {
    setIsLoading(tier);
    const result = await createCheckoutSession(tier);

    if (result.success && result.url) {
      window.location.href = result.url;
    } else if (result.error === 'Unauthorized. Please sign in.') {
      // Only redirect to signup if actually unauthorized
      router.push(`/signup?checkout=${tier}`);
    } else {
      // For actual Stripe errors (like missing Price IDs), alert the user
      alert(`Stripe Checkout Error: ${result.error || 'Configuration missing. Check your Vercel keys.'}`);
    }
    setIsLoading(null);
  };

  return (
    <div className="flex flex-col min-h-screen overflow-hidden bg-[#0A0A0A] text-gray-100">

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-32 lg:pt-40 lg:pb-40 overflow-hidden isolate">
        {/* Abstract Dark Background Glows */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-blue-900/30 rounded-full blur-[120px] -z-10" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/3 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[100px] -z-10" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 -z-10 mix-blend-overlay"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-white/10 text-gray-300 text-sm font-medium mb-8 shadow-2xl backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Enterprise Voice AI Agents are Live
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-[1.1]">
              The unfair AI advantage for <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                Home Services
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 mb-10 leading-relaxed max-w-3xl mx-auto font-light">
              Home sale extractor tool with contact information and direct input to a pipeline CRM. Try for free! Just search by zip code.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="#pricing"
                className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                See Pricing <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-[#111111] text-white border border-white/10 rounded-full font-bold text-lg hover:bg-[#1A1A1A] transition-all flex flex-col items-center justify-center gap-0.5 backdrop-blur-lg group"
              >
                <span>Try for Free</span>
                <span className="text-[10px] text-gray-500 font-medium tracking-wide uppercase group-hover:text-gray-400 transition-colors">10 Extracts Included</span>
              </Link>
            </div>
          </motion.div>

          {/* MacOS Dark Mode Dashboard Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative max-w-5xl mx-auto perspective-1000"
          >
            <div className="rounded-2xl border border-white/10 bg-[#141414]/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/5">
              {/* MacOS Window Header */}
              <div className="bg-[#1A1A1A] flex items-center px-4 py-3 border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {/* Mock CRM UI elements - Dark Mode */}
                <div className="bg-[#1C1C1C] p-6 rounded-xl border border-white/5 shadow-inner col-span-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-500/10 p-3 rounded-lg ring-1 ring-blue-500/30">
                      <Bot className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="font-bold text-gray-200">AI Inbox</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-[#242424] p-3 rounded-lg text-sm border border-white/5">
                      <p className="font-semibold text-gray-200">Jane Doe</p>
                      <p className="text-gray-400 truncate mt-1">"Do you guys do driveway washing?..."</p>
                      <div className="mt-3 text-[11px] font-medium tracking-wide uppercase bg-green-500/10 text-green-400 inline-block px-2 py-1 rounded border border-green-500/20">Auto-replied</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1C1C1C] p-6 rounded-xl border border-white/5 shadow-inner col-span-2 relative overflow-hidden">
                  <h3 className="font-bold mb-4 text-gray-200">Live Pipeline</h3>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-[#242424] rounded-lg p-3 text-sm border border-white/5">
                      <p className="font-semibold text-gray-400 mb-3">New</p>
                      <div className="bg-[#303030] p-3 rounded-md border border-white/10 shadow-sm mb-2 font-medium text-gray-200 transition-colors hover:bg-[#383838]">123 Main St</div>
                      <div className="bg-[#303030] p-3 rounded-md border border-white/10 shadow-sm font-medium text-gray-200 transition-colors hover:bg-[#383838]">456 Oak Ave</div>
                    </div>
                    <div className="flex-1 bg-[#242424] rounded-lg p-3 text-sm border border-white/5">
                      <p className="font-semibold text-gray-400 mb-3">Quoted</p>
                      <div className="bg-[#303030] p-3 rounded-md border border-white/10 shadow-sm border-l-4 border-l-blue-500 font-medium text-gray-200">
                        $850 - Roof Wash
                      </div>
                    </div>
                  </div>
                  {/* Dark Mode Gradient Fade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1C] via-[#1C1C1C]/80 to-transparent flex items-end justify-center pb-6">
                    <Link href="/dashboard/crm" className="text-blue-400 font-bold hover:text-blue-300 transition-colors flex items-center gap-1 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">
                      Enter CRM <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CORE FEATURES */}
      <section id="features" className="py-24 bg-[#0A0A0A] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">Everything you need to scale</h2>
            <p className="text-xl text-gray-400 font-light">From SEO domination to totally autonomous answering agents, TrendCast provides a complete backend system.</p>
          </div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="whileInView"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative"
          >
            {/* Feature Cards - Glassmorphic Dark */}
            <motion.div variants={fadeIn} className="bg-[#111111] rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-inner border border-white/5 mb-6 group-hover:scale-110 transition-transform ring-1 ring-blue-500/20">
                <LineChart className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-100">Programmatic SEO</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Dominate local search results. We auto-generate dozens of highly-targeted, location-specific landing pages that rank fast.</p>
            </motion.div>

            <motion.div variants={fadeIn} className="bg-[#111111] rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-inner border border-white/5 mb-6 group-hover:scale-110 transition-transform ring-1 ring-yellow-500/20">
                <Zap className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-100">Zillow Lead Scraper</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Our invisible bots scrape newly sold homes in your zip codes and enrich them with homeowner cell phone numbers automatically.</p>
            </motion.div>

            <motion.div variants={fadeIn} className="bg-[#111111] rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-inner border border-white/5 mb-6 group-hover:scale-110 transition-transform ring-1 ring-indigo-500/20">
                <Bot className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-100">Omnichannel AI Assistant</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Missed a call? Our AI texts them back instantly, qualifies the lead, checks your availability, and provides rough estimates.</p>
            </motion.div>

            <motion.div variants={fadeIn} className="bg-[#111111] rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-inner border border-white/5 mb-6 group-hover:scale-110 transition-transform ring-1 ring-green-500/20">
                <ShieldCheck className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-100">Reputation Management</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Automated post-job text surveys. 5-star reviews go straight to Google. 1-star complaints go straight to your private inbox.</p>
            </motion.div>

            <motion.div variants={fadeIn} className="bg-[#111111] rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-inner border border-white/5 mb-6 group-hover:scale-110 transition-transform ring-1 ring-red-500/20">
                <PhoneCall className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-100">AI Voice Agents</h3>
              <p className="text-gray-400 leading-relaxed text-sm">A human-sounding voice assistant that answers your phones 24/7, books jobs directly into your CRM, and never calls in sick.</p>
            </motion.div>

            <motion.div variants={fadeIn} className="bg-[#111111] rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-inner border border-white/5 mb-6 group-hover:scale-110 transition-transform ring-1 ring-purple-500/20">
                <CalendarCheck className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-100">Custom CRM</h3>
              <p className="text-gray-400 leading-relaxed text-sm">Stop paying for five different software subscriptions. Manage your entire pipeline, invoices, and scheduling in one place.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-24 bg-[#050505] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl text-white mb-4">Simple, powerful tiers</h2>
            <p className="text-xl text-gray-400 font-light">Invest in the machine that prints money for your home service business.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Tier 1 */}
            <div className="bg-[#111111] rounded-3xl p-8 border border-white/10 flex flex-col hover:border-white/20 transition-colors shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2">Intro</h3>
              <p className="text-gray-400 mb-6 min-h-[48px] text-sm">The SEO Powerhouse to establish local dominance.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">$34.99</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-300">
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> 100 Address Extracts /mo</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> 500 Contact Reveal Credits</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> Pipeline Management CRM</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> Lead Scoring Dashboard</li>
              </ul>
              <button
                onClick={() => handleUpgrade('INTRO')}
                disabled={!!isLoading}
                className="w-full py-3.5 rounded-xl bg-[#222222] text-white hover:bg-[#333333] border border-white/5 font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading === 'INTRO' ? <Activity className="w-5 h-5 animate-pulse" /> : 'Start Intro'}
              </button>
            </div>

            {/* Tier 2 */}
            <div className="bg-[#111111] rounded-3xl p-8 border border-white/10 flex flex-col hover:border-white/20 transition-colors shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              <p className="text-gray-400 mb-6 min-h-[48px] text-sm">The Outbound Engine that hunts down leads for you.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">$149.99</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-300">
                <li className="flex items-start gap-3 font-semibold text-gray-100">Everything in Intro, plus:</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> 1,000 Address Extracts /mo</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> 5,000 Contact Reveal Credits</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> Playwright Stealth Proxy Pool</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> Advanced Bot Bypass API</li>
              </ul>
              <button
                onClick={() => handleUpgrade('PRO')}
                disabled={!!isLoading}
                className="w-full py-3.5 rounded-xl bg-[#222222] text-white hover:bg-[#333333] border border-white/5 font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading === 'PRO' ? <Activity className="w-5 h-5 animate-pulse" /> : 'Start Pro'}
              </button>
            </div>

            {/* Tier 3 (Highlighted) */}
            <div className="bg-gradient-to-b from-[#1E293B] to-[#0F172A] rounded-3xl p-8 border border-blue-500/50 flex flex-col transform md:-translate-y-4 shadow-[0_0_40px_rgba(59,130,246,0.15)] relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold px-4 py-1 rounded-full text-[10px] tracking-wider uppercase shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Ultimate</h3>
              <p className="text-blue-200/70 mb-6 min-h-[48px] text-sm font-light">The Omnichannel AI Assistant that closes deals in your sleep.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">$399.99</span>
                <span className="text-blue-200/50">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-blue-50">
                <li className="flex items-start gap-3 font-semibold text-white">Everything in Pro, plus:</li>
                <li className="flex items-start gap-3"><span className="text-yellow-400">★</span> Unlimited Address Extracts</li>
                <li className="flex items-start gap-3"><span className="text-yellow-400">★</span> 25,000 Contact Reveal Credits</li>
                <li className="flex items-start gap-3"><span className="text-yellow-400">★</span> Unlimited API Syncing</li>
                <li className="flex items-start gap-3"><span className="text-yellow-400">★</span> CSV Bulk Data Export</li>
              </ul>
              <button
                onClick={() => handleUpgrade('ULTIMATE')}
                disabled={!!isLoading}
                className="w-full py-3.5 rounded-xl bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:bg-blue-400 font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading === 'ULTIMATE' ? <Activity className="w-5 h-5 animate-pulse" /> : 'Start Ultimate'}
              </button>
            </div>

            {/* Tier 4 */}
            <div className="bg-[#111111] rounded-3xl p-8 border border-white/10 flex flex-col hover:border-white/20 transition-colors shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-gray-400 mb-6 min-h-[48px] text-sm">The Autonomous Business. Replace your entire back office.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">Starting at $999</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-300">
                <li className="flex items-start gap-3 font-semibold text-gray-100">Everything in Ultimate, plus:</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> Automated Sales Funnel Sync</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> SEO Powerhouse Website</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> Long Tail Keyword Articles</li>
                <li className="flex items-start gap-3"><span className="text-blue-500">✓</span> Custom Domain Routing</li>
              </ul>
              <button className="w-full py-3.5 rounded-xl bg-[#222222] text-white hover:bg-[#333333] border border-white/5 font-semibold transition-colors">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#050505] border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100">
            <div className="w-8 h-8 rounded-lg bg-[#222222] border border-white/10 flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              TrendCast<span className="text-blue-500">.ai</span>
            </span>
          </div>
          <p className="text-gray-600 text-sm">© 2026 TrendCast.ai. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link href="#" className="text-gray-500 hover:text-gray-300 transition-colors">Terms</Link>
            <Link href="#" className="text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-gray-500 hover:text-gray-300 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
