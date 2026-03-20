import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWebsiteBuildInquiryNotification } from '@/lib/websiteBuildInquiryEmail';
import { createWebsiteBuildCheckoutSession } from '@/lib/websiteBuildCheckout';
import { canUseS3Storage, createSignedS3GetUrl, uploadBufferToS3 } from '@/lib/visualEstimator/s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INTERNAL_ORG_NAME = 'Trendcast Website Inquiries';
const MAX_PROJECT_PHOTOS = 6;
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PROJECT_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;

type InquiryIntent = 'inquiry' | 'checkout';

type WebsiteBuildRequest = {
    intent: InquiryIntent;
    name: string;
    email: string;
    phone: string;
    businessName: string;
    industry: string;
    cityState: string;
    currentWebsite: string;
    notes: string;
    logoFile: File | null;
    projectPhotos: File[];
};

function clean(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeIntent(value: string): InquiryIntent {
    return value === 'checkout' ? 'checkout' : 'inquiry';
}

function safeKeySegment(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9.\-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'file';
}

function parseImageFile(entry: FormDataEntryValue | null, maxSizeBytes: number, label: string) {
    if (!(entry instanceof File) || entry.size === 0) return null;
    if (!entry.type.startsWith('image/')) {
        throw new Error(`${label} must be an image file.`);
    }
    if (entry.size > maxSizeBytes) {
        throw new Error(`${label} exceeds the size limit.`);
    }
    return entry;
}

async function parseRequest(request: Request): Promise<WebsiteBuildRequest> {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const logoFile = parseImageFile(formData.get('logo'), MAX_LOGO_SIZE_BYTES, 'Logo');
        const projectPhotos = formData
            .getAll('projectPhotos')
            .map((entry, index) => parseImageFile(entry, MAX_PROJECT_PHOTO_SIZE_BYTES, `Project photo ${index + 1}`))
            .filter((file): file is File => Boolean(file));

        return {
            intent: normalizeIntent(clean(formData.get('intent'))),
            name: clean(formData.get('name')),
            email: clean(formData.get('email')).toLowerCase(),
            phone: clean(formData.get('phone')),
            businessName: clean(formData.get('businessName')),
            industry: clean(formData.get('industry')),
            cityState: clean(formData.get('cityState')),
            currentWebsite: clean(formData.get('currentWebsite')),
            notes: clean(formData.get('notes')),
            logoFile,
            projectPhotos,
        };
    }

    const body = await request.json() as Record<string, unknown>;
    return {
        intent: normalizeIntent(clean(body.intent)),
        name: clean(body.name),
        email: clean(body.email).toLowerCase(),
        phone: clean(body.phone),
        businessName: clean(body.businessName),
        industry: clean(body.industry),
        cityState: clean(body.cityState),
        currentWebsite: clean(body.currentWebsite),
        notes: clean(body.notes),
        logoFile: null,
        projectPhotos: [],
    };
}

async function getOrCreateInternalInquiryOrg() {
    const existing = await prisma.organization.findFirst({
        where: {
            name: INTERNAL_ORG_NAME,
        },
        select: {
            id: true,
        },
    });

    if (existing) {
        return existing.id;
    }

    const created = await prisma.organization.create({
        data: {
            name: INTERNAL_ORG_NAME,
            tier: 'ENTERPRISE',
            industry: 'Internal Sales',
            credits: 0,
            extracts: 0,
        },
        select: {
            id: true,
        },
    });

    return created.id;
}

async function uploadInquiryImage(file: File, businessName: string, kind: 'logo' | 'project') {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.includes('.') ? file.name.split('.').pop() || 'jpg' : 'jpg';
    const key = [
        'website-builds',
        safeKeySegment(businessName || 'contractor'),
        `${Date.now()}-${crypto.randomUUID()}-${kind}.${safeKeySegment(extension)}`,
    ].join('/');

    await uploadBufferToS3(key, buffer, file.type || 'application/octet-stream');

    return {
        name: file.name,
        key,
        url: createSignedS3GetUrl(key, 60 * 60 * 24 * 7),
    };
}

async function uploadInquiryAssets(input: Pick<WebsiteBuildRequest, 'businessName' | 'logoFile' | 'projectPhotos'>) {
    if (!input.logoFile && input.projectPhotos.length === 0) {
        return {
            logo: null,
            projectPhotos: [] as Array<{ name: string; key: string; url: string }>,
        };
    }

    if (input.projectPhotos.length > MAX_PROJECT_PHOTOS) {
        throw new Error(`Please upload up to ${MAX_PROJECT_PHOTOS} project photos.`);
    }

    if (!canUseS3Storage()) {
        throw new Error('File uploads are not configured yet. Please remove attachments or configure S3 storage.');
    }

    const logo = input.logoFile ? await uploadInquiryImage(input.logoFile, input.businessName, 'logo') : null;
    const projectPhotos = [];
    for (const file of input.projectPhotos) {
        projectPhotos.push(await uploadInquiryImage(file, input.businessName, 'project'));
    }

    return { logo, projectPhotos };
}

export async function POST(request: Request) {
    try {
        const body = await parseRequest(request);

        if (!body.name || !body.email || !body.phone || !body.businessName || !body.industry) {
            return NextResponse.json(
                { success: false, error: 'Name, email, phone, business name, and industry are required.' },
                { status: 400 },
            );
        }

        if (body.intent === 'checkout' && body.projectPhotos.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Please upload at least one project photo before checkout.' },
                { status: 400 },
            );
        }

        const assets = await uploadInquiryAssets(body);
        const orgId = await getOrCreateInternalInquiryOrg();

        const details = [
            `Business: ${body.businessName}`,
            `Industry: ${body.industry}`,
            body.cityState ? `Location: ${body.cityState}` : null,
            `Email: ${body.email}`,
            body.currentWebsite ? `Current Website: ${body.currentWebsite}` : null,
            body.notes ? `Notes: ${body.notes}` : null,
            assets.logo ? `Logo: ${assets.logo.url}` : null,
            assets.projectPhotos.length ? `Project Photos: ${assets.projectPhotos.map((asset) => asset.url).join(', ')}` : null,
            body.intent === 'checkout' ? 'Checkout Intent: Yes' : null,
        ]
            .filter(Boolean)
            .join(' | ');

        const lead = await prisma.lead.create({
            data: {
                orgId,
                name: body.name,
                phone: body.phone,
                address: details,
                source: body.intent === 'checkout' ? 'WEBSITE_BUILD_CHECKOUT' : 'WEBSITE_BUILD_INQUIRY',
                status: 'NEW',
            },
            select: {
                id: true,
            },
        });

        let emailNotificationSent = false;
        try {
            const notificationResult = await sendWebsiteBuildInquiryNotification({
                name: body.name,
                email: body.email,
                phone: body.phone,
                businessName: body.businessName,
                industry: body.industry,
                cityState: body.cityState,
                currentWebsite: body.currentWebsite,
                notes: body.notes,
                logoUrl: assets.logo?.url,
                projectPhotoUrls: assets.projectPhotos.map((asset) => asset.url),
                intent: body.intent,
            });
            emailNotificationSent = notificationResult.sent;
        } catch (error) {
            console.error('Website build inquiry email failed:', error);
        }

        if (body.intent === 'checkout') {
            if (!process.env.STRIPE_SECRET_KEY) {
                return NextResponse.json(
                    { success: false, error: 'Stripe checkout is not configured yet.', inquiryId: lead.id, emailNotificationSent },
                    { status: 500 },
                );
            }

            const checkoutSession = await createWebsiteBuildCheckoutSession({
                inquiryId: lead.id,
                name: body.name,
                email: body.email,
                businessName: body.businessName,
                industry: body.industry,
            });

            return NextResponse.json({
                success: true,
                inquiryId: lead.id,
                emailNotificationSent,
                url: checkoutSession.url,
            });
        }

        return NextResponse.json({
            success: true,
            inquiryId: lead.id,
            emailNotificationSent,
        });
    } catch (error) {
        console.error('Website build inquiry failed:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to submit inquiry.' },
            { status: 500 },
        );
    }
}
