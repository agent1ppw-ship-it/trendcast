'use client';

import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type InquiryIntent = 'inquiry' | 'checkout';

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

type InquiryResponse = {
    success?: boolean;
    error?: string;
    url?: string;
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

const MAX_PROJECT_PHOTOS = 6;

export function WebsiteBuildInquiryForm() {
    const searchParams = useSearchParams();
    const [form, setForm] = useState<FormState>(INITIAL_STATE);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [projectPhotos, setProjectPhotos] = useState<File[]>([]);
    const [submittingIntent, setSubmittingIntent] = useState<InquiryIntent | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const logoInputRef = useRef<HTMLInputElement | null>(null);
    const photoInputRef = useRef<HTMLInputElement | null>(null);

    const checkoutStatus = searchParams.get('checkout');

    async function submit(intent: InquiryIntent) {
        if (intent === 'checkout' && projectPhotos.length === 0) {
            setSuccessMessage('');
            setErrorMessage('Please upload at least one project photo before checkout.');
            return;
        }

        setSubmittingIntent(intent);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const payload = new FormData();
            payload.append('intent', intent);
            payload.append('name', form.name);
            payload.append('email', form.email);
            payload.append('phone', form.phone);
            payload.append('businessName', form.businessName);
            payload.append('industry', form.industry);
            payload.append('cityState', form.cityState);
            payload.append('currentWebsite', form.currentWebsite);
            payload.append('notes', form.notes);

            if (logoFile) {
                payload.append('logo', logoFile);
            }

            projectPhotos.forEach((file) => {
                payload.append('projectPhotos', file);
            });

            const response = await fetch('/api/website-build-inquiry', {
                method: 'POST',
                body: payload,
            });

            const result = await response.json() as InquiryResponse;
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to submit inquiry.');
            }

            if (intent === 'checkout' && result.url) {
                window.location.href = result.url;
                return;
            }

            setSuccessMessage('Inquiry received. We can now follow up on your website build request.');
            setForm(INITIAL_STATE);
            setLogoFile(null);
            setProjectPhotos([]);
            if (logoInputRef.current) logoInputRef.current.value = '';
            if (photoInputRef.current) photoInputRef.current.value = '';
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to submit inquiry.');
        } finally {
            setSubmittingIntent(null);
        }
    }

    function updateField(field: keyof FormState, value: string) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] || null;
        setLogoFile(file);
    }

    function handleProjectPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files || []);
        if (files.length > MAX_PROJECT_PHOTOS) {
            setErrorMessage(`Please upload up to ${MAX_PROJECT_PHOTOS} project photos.`);
            setProjectPhotos(files.slice(0, MAX_PROJECT_PHOTOS));
            return;
        }

        setErrorMessage('');
        setProjectPhotos(files);
    }

    function isSubmitting(intent?: InquiryIntent) {
        return submittingIntent !== null && (!intent || submittingIntent === intent);
    }

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                void submit('checkout');
            }}
            className="space-y-6"
        >
            {checkoutStatus === 'success' ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                    Payment received. We have your website build order and will follow up on the project details shortly.
                </div>
            ) : null}

            {checkoutStatus === 'cancelled' ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    Checkout was canceled. Your project details can still be submitted below, or you can restart secure checkout when ready.
                </div>
            ) : null}

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

            <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-200">Logo Upload</span>
                    <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="w-full rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm text-gray-300 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-500/15 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-orange-200"
                    />
                    <p className="mt-2 text-xs text-gray-500">Optional. Upload a logo if you already have one.</p>
                    {logoFile ? <p className="mt-2 text-xs text-gray-300">{logoFile.name}</p> : null}
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-200">Project Photos</span>
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleProjectPhotoChange}
                        className="w-full rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm text-gray-300 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400/15 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cyan-200"
                    />
                    <p className="mt-2 text-xs text-gray-500">Upload up to 6 project photos. At least one photo is required for the $399 checkout flow.</p>
                    {projectPhotos.length ? (
                        <div className="mt-2 space-y-1 text-xs text-gray-300">
                            {projectPhotos.map((file) => (
                                <p key={`${file.name}-${file.size}`}>{file.name}</p>
                            ))}
                        </div>
                    ) : null}
                </label>
            </div>

            <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-200">What do you need?</span>
                <textarea
                    rows={5}
                    value={form.notes}
                    onChange={(event) => updateField('notes', event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-orange-400/50"
                    placeholder="Tell us about the services you want featured, the areas you serve, any sites you like, and the types of leads you want the site to bring in."
                />
            </label>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-gray-300">
                <p className="font-semibold text-white">$399 one-time website build</p>
                <p className="mt-2">
                    Use secure Stripe checkout to reserve your build now, or just submit the project details first if you want us to review them before payment.
                </p>
            </div>

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

            <div className="flex flex-wrap gap-3">
                <button
                    type="submit"
                    disabled={submittingIntent !== null}
                    className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-6 py-4 text-sm font-extrabold text-white transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting('checkout') ? 'Opening Checkout...' : 'Proceed to Secure Checkout'}
                </button>
                <button
                    type="button"
                    onClick={() => void submit('inquiry')}
                    disabled={submittingIntent !== null}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/5 px-6 py-4 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting('inquiry') ? 'Submitting...' : 'Submit Details Only'}
                </button>
            </div>
        </form>
    );
}
