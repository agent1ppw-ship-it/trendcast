import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { ensureUserOrganizationByEmail } from '@/lib/organizationProvisioning';
import { analyzeProjectImagesWithVision } from '@/lib/visualEstimator/vision';
import { canUseS3Storage, createSignedS3GetUrl, uploadBufferToS3 } from '@/lib/visualEstimator/s3';
import { generateGoodBetterBestQuote } from '@/lib/visualEstimator/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseSquareFootage(input: FormDataEntryValue | null) {
    if (typeof input !== 'string') return null;
    const value = Number(input);
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.min(500000, Math.round(value));
}

function safeKeySegment(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9.\-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'image';
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const orgId = session.user.orgId || (await ensureUserOrganizationByEmail(session.user.email));
        if (!orgId) {
            return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
        }

        const formData = await request.formData();
        const uploadedFiles = formData
            .getAll('images')
            .filter((entry): entry is File => entry instanceof File && entry.size > 0 && entry.type.startsWith('image/'));

        if (uploadedFiles.length === 0) {
            return NextResponse.json({ success: false, error: 'Please upload at least one image.' }, { status: 400 });
        }

        if (uploadedFiles.length > 6) {
            return NextResponse.json({ success: false, error: 'Please upload up to 6 images max.' }, { status: 400 });
        }

        const diagnostics: string[] = [];
        const imageUrls: string[] = [];
        const s3Enabled = canUseS3Storage();
        const now = Date.now();

        for (let index = 0; index < uploadedFiles.length; index += 1) {
            const file = uploadedFiles[index];
            if (file.size > 8 * 1024 * 1024) {
                return NextResponse.json({ success: false, error: `${file.name} exceeds the 8MB limit.` }, { status: 400 });
            }

            const buffer = Buffer.from(await file.arrayBuffer());

            if (s3Enabled) {
                const key = `visual-estimator/${orgId}/${now}-${index}-${safeKeySegment(file.name || 'image')}`;
                await uploadBufferToS3(key, buffer, file.type || 'application/octet-stream');
                imageUrls.push(createSignedS3GetUrl(key, 3600));
            } else {
                // Fallback for environments not yet configured with AWS.
                const base64 = buffer.toString('base64');
                imageUrls.push(`data:${file.type || 'image/jpeg'};base64,${base64}`);
            }
        }

        if (!s3Enabled) {
            diagnostics.push('AWS S3 is not configured; using temporary data URLs for analysis.');
        }

        const issueContext = String(formData.get('issueContext') || '').trim();
        const industry = String(formData.get('industry') || 'Home Services').trim() || 'Home Services';
        const squareFootage = parseSquareFootage(formData.get('squareFootage'));
        const mapAddress = String(formData.get('mapAddress') || '').trim();

        if (squareFootage) {
            diagnostics.push(`Using ${squareFootage.toLocaleString('en-US')} sq ft scope hint for pricing.`);
        }

        const vision = await analyzeProjectImagesWithVision({
            imageUrls,
            industry,
            customerContext: issueContext,
            squareFootageHint: squareFootage,
            mapAddress,
        });

        const quotes = await generateGoodBetterBestQuote({
            orgId,
            vision,
            squareFootage,
        });

        return NextResponse.json({
            success: true,
            result: {
                issueSummary: vision.detected_issue,
                complexityScore: vision.complexity_score,
                estimatedLaborHours: vision.estimated_labor_hours,
                materials: vision.estimated_materials,
                squareFootage: squareFootage || undefined,
                mapAddress: mapAddress || undefined,
                imageUrls,
                quotes,
                diagnostics,
            },
        });
    } catch (error) {
        console.error('[VisualEstimator] analyze-images failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to analyze uploaded images.',
            },
            { status: 500 },
        );
    }
}
