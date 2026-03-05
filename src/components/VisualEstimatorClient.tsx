'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Loader2, UploadCloud, Wrench } from 'lucide-react';
import type { VisualEstimateResponse } from '@/lib/visualEstimator/types';

function formatUsd(value: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

export function VisualEstimatorClient({ defaultIndustry }: { defaultIndustry: string }) {
    const [industry, setIndustry] = useState(defaultIndustry || 'Home Services');
    const [issueContext, setIssueContext] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isDragActive, setIsDragActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<VisualEstimateResponse | null>(null);

    const previews = useMemo(() => {
        return files.map((file) => ({
            name: file.name,
            url: URL.createObjectURL(file),
        }));
    }, [files]);

    useEffect(() => {
        return () => {
            previews.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, [previews]);

    const onFileChange = (incoming: FileList | null) => {
        if (!incoming) return;
        const imageFiles = Array.from(incoming).filter((file) => file.type.startsWith('image/')).slice(0, 6);
        setFiles(imageFiles);
    };

    const handleSubmit = async () => {
        if (!files.length) {
            setError('Upload at least one photo to generate an instant estimate.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setResult(null);

        try {
            const body = new FormData();
            for (const file of files) {
                body.append('images', file);
            }
            body.append('issueContext', issueContext);
            body.append('industry', industry);

            const response = await fetch('/api/analyze-images', {
                method: 'POST',
                body,
            });

            const payload = await response.json();
            if (!response.ok || !payload.success || !payload.result) {
                setError(payload.error || 'AI analysis failed. Please try again.');
                setIsSubmitting(false);
                return;
            }

            setResult(payload.result as VisualEstimateResponse);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unexpected upload error.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] p-4 text-gray-100 md:p-8">
            <div className="mb-8">
                <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">AI Spatial Estimator & Instant Quoting</h1>
                <p className="text-sm text-gray-400">
                    Upload 1-6 project photos to generate an instant preliminary Good / Better / Best quote.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
                <Card className="border-white/5 bg-[#111]">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                            <UploadCloud className="h-5 w-5 text-blue-400" />
                            Project Image Upload
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Industry</label>
                            <input
                                type="text"
                                value={industry}
                                onChange={(event) => setIndustry(event.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-4 py-2.5 text-white focus:border-blue-500/50 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Issue Notes</label>
                            <textarea
                                value={issueContext}
                                onChange={(event) => setIssueContext(event.target.value)}
                                rows={4}
                                placeholder="Example: Backyard is overgrown and needs cleanup before listing."
                                className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-4 py-3 text-white focus:border-blue-500/50 focus:outline-none"
                            />
                        </div>

                        <label className="block cursor-pointer rounded-2xl border border-dashed border-blue-500/40 bg-blue-500/10 px-5 py-7 text-center transition-all hover:border-blue-400/60 hover:bg-blue-500/15">
                            <div
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setIsDragActive(true);
                                }}
                                onDragLeave={() => setIsDragActive(false)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setIsDragActive(false);
                                    onFileChange(event.dataTransfer.files);
                                }}
                                className={`rounded-xl border border-dashed px-4 py-6 transition-all ${isDragActive ? 'border-blue-300 bg-blue-500/20' : 'border-transparent'}`}
                            >
                                <Camera className="mx-auto mb-3 h-7 w-7 text-blue-300" />
                                <p className="text-sm font-medium text-blue-200">Drop project photos here or click to upload</p>
                                <p className="mt-2 text-xs text-blue-200/80">PNG/JPG/WEBP • up to 6 images • 8MB each</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(event) => onFileChange(event.target.files)}
                                />
                            </div>
                        </label>

                        {files.length > 0 && (
                            <div className="space-y-2 rounded-xl border border-white/10 bg-[#161616] p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{files.length} image(s) selected</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {previews.map((preview) => (
                                        <img
                                            key={preview.url}
                                            src={preview.url}
                                            alt={preview.name}
                                            className="h-24 w-full rounded-md border border-white/10 object-cover"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-[0_0_18px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-500 disabled:opacity-60"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                            {isSubmitting ? 'AI is analyzing your project...' : 'Analyze Project & Generate Quote'}
                        </button>

                        {error && (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {!result && !isSubmitting && (
                        <Card className="border-white/5 bg-[#111]">
                            <CardContent className="px-8 py-16 text-center">
                                <p className="text-base text-gray-300">Upload photos to generate an instant preliminary quote.</p>
                                <p className="mt-2 text-sm text-gray-500">The AI will estimate issue scope, materials, labor hours, and Good/Better/Best pricing.</p>
                            </CardContent>
                        </Card>
                    )}

                    {isSubmitting && (
                        <Card className="border-white/5 bg-[#111]">
                            <CardContent className="space-y-5 px-6 py-10">
                                <div className="h-6 w-64 animate-pulse rounded bg-white/10" />
                                <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                                <div className="h-4 w-4/5 animate-pulse rounded bg-white/10" />
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="h-28 animate-pulse rounded-xl bg-white/10" />
                                    <div className="h-28 animate-pulse rounded-xl bg-white/10" />
                                    <div className="h-28 animate-pulse rounded-xl bg-white/10" />
                                </div>
                                <p className="text-sm text-blue-300">AI is analyzing your project...</p>
                            </CardContent>
                        </Card>
                    )}

                    {result && (
                        <>
                            <Card className="border-white/5 bg-[#111]">
                                <CardHeader className="border-b border-white/5 pb-4">
                                    <CardTitle className="text-lg text-white">Vision Analysis Output</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Detected Issue</p>
                                        <p className="mt-2 text-gray-200">{result.issueSummary}</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="rounded-xl border border-white/10 bg-[#161616] p-4">
                                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Complexity Score</p>
                                            <p className="mt-2 text-2xl font-bold text-white">{result.complexityScore}/10</p>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-[#161616] p-4">
                                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Estimated Labor Hours</p>
                                            <p className="mt-2 text-2xl font-bold text-white">{result.estimatedLaborHours}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Estimated Materials</p>
                                        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-300">
                                            {result.materials.map((material) => (
                                                <li key={material}>{material}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {result.quotes.map((quote) => (
                                    <Card key={quote.tier} className={`border ${quote.tier === 'Best' ? 'border-blue-500/35' : 'border-white/10'} bg-[#111]`}>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-xl text-white">{quote.tier}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-3xl font-extrabold text-white">{formatUsd(quote.total)}</p>
                                            <p className="mt-2 text-sm text-gray-400">{quote.summary}</p>
                                            <div className="mt-4 space-y-1 text-xs text-gray-500">
                                                <p>Labor: {formatUsd(quote.laborCost)}</p>
                                                <p>Materials: {formatUsd(quote.materialsCost)}</p>
                                                <p>Overhead + Margin: {formatUsd(quote.overheadAndMargin)}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {result.diagnostics?.length ? (
                                <Card className="border-amber-500/20 bg-amber-500/10">
                                    <CardContent className="pt-5">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Diagnostics</p>
                                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-200">
                                            {result.diagnostics.map((message) => (
                                                <li key={message}>{message}</li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ) : null}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
