'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/app/actions/auth';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        const result = await signUp(formData);

        if (!result.success) {
            setError(result.error as string);
            setIsLoading(false);
        } else {
            router.push('/dashboard/crm');
            router.refresh(); // Force re-evaluation of layout to pick up cookie status
        }
    }

    return (
        <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-[#0A0A0A] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 -z-10 mix-blend-overlay pointer-events-none"></div>

            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-2 grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100 mb-6 mx-auto">
                        <div className="w-8 h-8 rounded-lg bg-[#222222] border border-white/10 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">T</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">
                            TrendCast<span className="text-blue-500">.ai</span>
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Claim Your Setup</h1>
                    <p className="text-gray-400 font-light">Start your free trial. Includes 10 automated address extracts and 50 reveal credits instantly.</p>
                </div>

                <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl pointer-events-none"></div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form action={onSubmit} className="space-y-5 relative z-10">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Work Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="owner@roofingcompany.com"
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                            <input
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 mt-2 rounded-xl bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500 font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Provisioning Instance...</>
                            ) : (
                                <>Get Free Trial <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        Already have an account? <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Log in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
