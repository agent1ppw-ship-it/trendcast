'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { submitDemoRequest } from '@/app/actions/demo';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await submitDemoRequest(formData);
        if (result.success) {
            setIsSuccess(true);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-gray-200">
            <Navbar />

            <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto relative z-10 flex flex-col items-center">
                {/* Background Glows */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

                <Link href="/" className="inline-flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-colors mb-8 self-start group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>

                <div className="w-full bg-[#111] border border-white/5 rounded-2xl shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

                    {isSuccess ? (
                        <div className="p-10 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle2 className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3">Request Received</h2>
                            <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                                Thank you for your interest! A member of our team will reach out to <span className="text-gray-200 font-medium">{formData.email}</span> shortly to schedule your personalized demo.
                            </p>
                            <Link href="/">
                                <button className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    Return to Homepage
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="p-8">
                            <h1 className="text-3xl font-extrabold text-white mb-2">Book a Live Demo</h1>
                            <p className="text-gray-400 text-sm mb-8">
                                See exactly how TrendCast can automate your home service business from lead generation to booked jobs.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name <span className="text-red-400">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Work Email <span className="text-red-400">*</span></label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                        placeholder="john@company.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Company Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                        placeholder="Acme Landscaping"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full mt-4 bg-white text-black font-semibold px-6 py-3.5 rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-gray-200 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Request Demo'}
                                </button>

                                <p className="text-center text-[10px] text-gray-500 mt-4 leading-relaxed">
                                    By submitting this form, you agree to our Privacy Policy. We'll only use your email to schedule the demo.
                                </p>
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
