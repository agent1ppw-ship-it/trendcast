'use client';

import { useState } from 'react';

type FormState = {
    name: string;
    email: string;
    phone: string;
    businessName: string;
    industry: string;
    cityState: string;
    currentWebsite: string;
    notes: string;
};

const INITIAL_STATE: FormState = {
    name: '',
    email: '',
    phone: '',
    businessName: '',
    industry: '',
    cityState: '',
    currentWebsite: '',
    notes: '',
};

export function WebsiteBuildInquiryForm() {
    const [form, setForm] = useState<FormState>(INITIAL_STATE);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const response = await fetch('/api/website-build-inquiry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });

            const payload = await response.json() as { success?: boolean; error?: string };
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || 'Failed to submit inquiry.');
            }

            setSuccessMessage('Inquiry received. We can now follow up on your website build request.');
            setForm(INITIAL_STATE);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to submit inquiry.');
        } finally {
            setSubmitting(false);
        }
    }

    function updateField(field: keyof FormState, value: string) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-200">Name</span>
                    <input
                        required
                        value={form.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-orange-400/50"
                        placeholder="Your name"
                    />
                </label>
                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-200">Business Name</span>
                    <input
                        required
                        value={form.businessName}
                        onChange={(event) => updateField('businessName', event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-orange-400/50"
                        placeholder="Business name"
                    />
                </label>
                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-200">Email</span>
                    <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-orange-400/50"
                        placeholder="you@company.com"
                    />
                </label>
                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-200">Phone</span>
                    <input
                        required
                        value={form.phone}
                        onChange={(event) => updateField('phone', event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-orange-400/50"
                        placeholder="(555) 555-5555"
                    />
                </label>
                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-200">Industry</span>
                    <input
                        required
                        value={form.industry}
                        onChange={(event) => updateField('industry', event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-orange-400/50"
                        placeholder="Roofing, landscaping, concrete..."
                    />
                </label>
                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-200">City / State</span>
                    <input
                        value={form.cityState}
                        onChange={(event) => updateField('cityState', event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-orange-400/50"
                        placeholder="Wausau, WI"
                    />
                </label>
            </div>

            <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-200">Current Website</span>
                <input
                    value={form.currentWebsite}
                    onChange={(event) => updateField('currentWebsite', event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-orange-400/50"
                    placeholder="https://yourcurrentwebsite.com"
                />
            </label>

            <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-200">What do you need?</span>
                <textarea
                    rows={5}
                    value={form.notes}
                    onChange={(event) => updateField('notes', event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-orange-400/50"
                    placeholder="Tell us about the services you want featured, any examples you like, and the kind of leads you want the site to bring in."
                />
            </label>

            {successMessage ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                    {successMessage}
                </div>
            ) : null}

            {errorMessage ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                </div>
            ) : null}

            <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-4 text-sm font-extrabold text-white transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {submitting ? 'Submitting...' : 'Request My Website Build'}
            </button>
        </form>
    );
}
