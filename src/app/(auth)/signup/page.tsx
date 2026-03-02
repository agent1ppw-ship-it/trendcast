'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, User } from 'lucide-react';
import { registerWithEmailPassword } from '@/app/actions/auth';

type AuthMode = 'signin' | 'signup';

function SignUpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { status } = useSession();
    const checkout = searchParams.get('checkout');
    const requestedMode = searchParams.get('mode');
    const callbackUrl = checkout ? `/dashboard?checkout=${checkout}` : '/dashboard/crm';

    const [mode, setMode] = useState<AuthMode>(requestedMode === 'signin' ? 'signin' : 'signup');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });

    const title = useMemo(
        () => (mode === 'signup' ? 'Create Your Account' : 'Sign In to TrendCast'),
        [mode]
    );

    const subtitle = useMemo(
        () =>
            mode === 'signup'
                ? 'Start your free trial with email/password or continue with Google.'
                : 'Use your email/password account or continue with Google.',
        [mode]
    );

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(callbackUrl);
            router.refresh();
        }
    }, [callbackUrl, router, status]);

    const handleGoogle = async () => {
        await signIn('google', { callbackUrl });
    };

    const handleCredentialsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (mode === 'signup') {
            const registerResult = await registerWithEmailPassword(formData);

            if (!registerResult.success) {
                setError(registerResult.error || 'Failed to create account.');
                setIsSubmitting(false);
                return;
            }
        }

        const signInResult = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            callbackUrl,
            redirect: false,
        });

        if (!signInResult?.ok) {
            setError(mode === 'signup' ? 'Account created, but sign-in failed.' : 'Invalid email or password.');
            setIsSubmitting(false);
            return;
        }

        router.push(signInResult.url || callbackUrl);
        router.refresh();
    };

    if (status === 'authenticated') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-gray-300">
                Redirecting to your CRM dashboard...
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-[#0A0A0A] relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 -z-10 mix-blend-overlay pointer-events-none"></div>

            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-2 grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100 mb-6 mx-auto">
                        <div className="w-8 h-8 rounded-lg bg-[#222222] border border-white/10 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">T</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">
                            trendcast<span className="text-blue-500">.io</span>
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">{title}</h1>
                    <p className="text-gray-400 font-light">{subtitle}</p>
                </div>

                <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl pointer-events-none"></div>

                    <div className="relative z-10 flex gap-2 p-1 rounded-xl bg-[#0E0E0E] border border-white/5 mb-6">
                        <button
                            type="button"
                            onClick={() => setMode('signup')}
                            className={mode === 'signup'
                                ? 'flex-1 py-2.5 rounded-lg bg-white text-black font-semibold'
                                : 'flex-1 py-2.5 rounded-lg text-gray-400 hover:text-white transition-colors'}
                        >
                            Sign Up
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('signin')}
                            className={mode === 'signin'
                                ? 'flex-1 py-2.5 rounded-lg bg-white text-black font-semibold'
                                : 'flex-1 py-2.5 rounded-lg text-gray-400 hover:text-white transition-colors'}
                        >
                            Sign In
                        </button>
                    </div>

                    <form onSubmit={handleCredentialsSubmit} className="relative z-10 space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                        placeholder="Jane Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                    placeholder="you@company.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    required
                                    type="password"
                                    minLength={8}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                    placeholder={mode === 'signup' ? 'Minimum 8 characters' : 'Enter your password'}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-base hover:bg-gray-100 transition-all disabled:opacity-60"
                        >
                            {isSubmitting ? (mode === 'signup' ? 'Creating Account...' : 'Signing In...') : (mode === 'signup' ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>

                    <div className="relative z-10 flex items-center gap-4 my-6">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-xs uppercase tracking-[0.24em] text-gray-500">or</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <button
                        onClick={handleGoogle}
                        className="w-full py-4 rounded-xl bg-[#181818] text-white font-bold text-lg hover:bg-[#1F1F1F] border border-white/10 transition-all flex items-center justify-center gap-3 relative z-10"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    <p className="text-gray-500 text-sm mt-6 relative z-10 text-center">
                        Credentials sign-in is now supported alongside Google OAuth.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SignUpPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
            <SignUpContent />
        </Suspense>
    );
}
