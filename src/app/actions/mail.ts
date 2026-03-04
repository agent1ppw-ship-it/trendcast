'use server';

import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { ensureOrganization } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import {
    DEFAULT_MAIL_TEMPLATES,
    MAIL_PRICING,
    calculateMailCost,
    getDirectMailMode,
    hasCompleteSenderProfile,
} from '@/lib/directMail';
import { processMailCampaignSend } from '@/lib/mailCampaigns';

type MailSize = keyof typeof MAIL_PRICING;

type CampaignInput = {
    name: string;
    templateId: string;
    leadIds: string[];
    scheduledAt?: string | null;
    postageClass?: 'MARKETING' | 'FIRST_CLASS';
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_123', {
    apiVersion: '2026-02-25.clover',
});

export async function ensureDefaultMailTemplates() {
    const orgId = await ensureOrganization();
    if (!orgId) return { success: false, error: 'Unauthorized.' };

    const count = await prisma.mailTemplate.count({ where: { orgId } });
    if (count > 0) return { success: true, created: 0 };

    await prisma.mailTemplate.createMany({
        data: DEFAULT_MAIL_TEMPLATES.map((template) => ({
            orgId,
            ...template,
        })),
    });

    revalidatePath('/dashboard/mail');
    return { success: true, created: DEFAULT_MAIL_TEMPLATES.length };
}

export async function saveMailSenderProfile(data: {
    mailFromName?: string;
    mailFromCompany?: string;
    mailAddressLine1: string;
    mailAddressLine2?: string;
    mailCity: string;
    mailState: string;
    mailZip: string;
}) {
    const orgId = await ensureOrganization();
    if (!orgId) return { success: false, error: 'Unauthorized.' };

    const normalizedState = data.mailState.trim().toUpperCase();
    const normalizedZip = data.mailZip.trim();

    if (!data.mailAddressLine1.trim() || !data.mailCity.trim() || !normalizedState || !normalizedZip) {
        return { success: false, error: 'Address line 1, city, state, and ZIP are required.' };
    }

    if (!data.mailFromName?.trim() && !data.mailFromCompany?.trim()) {
        return { success: false, error: 'Add at least a sender name or company name.' };
    }

    await prisma.organization.update({
        where: { id: orgId },
        data: {
            mailFromName: data.mailFromName?.trim() || null,
            mailFromCompany: data.mailFromCompany?.trim() || null,
            mailAddressLine1: data.mailAddressLine1.trim(),
            mailAddressLine2: data.mailAddressLine2?.trim() || null,
            mailCity: data.mailCity.trim(),
            mailState: normalizedState,
            mailZip: normalizedZip,
        },
    });

    revalidatePath('/dashboard/mail');
    return { success: true };
}

export async function createMailCampaign(input: CampaignInput) {
    const orgId = await ensureOrganization();
    if (!orgId) return { success: false, error: 'Unauthorized.' };

    const name = input.name.trim();
    const leadIds = Array.from(new Set(input.leadIds)).filter(Boolean);
    if (!name) return { success: false, error: 'Campaign name is required.' };
    if (leadIds.length === 0) return { success: false, error: 'Select at least one lead.' };

    const template = await prisma.mailTemplate.findFirst({
        where: { id: input.templateId, orgId },
    });

    if (!template) {
        return { success: false, error: 'Template not found.' };
    }

    const postageClass = template.size === '4X6'
        ? 'FIRST_CLASS'
        : (input.postageClass || 'MARKETING');

    const leads = await prisma.lead.findMany({
        where: {
            orgId,
            id: { in: leadIds },
        },
        select: {
            id: true,
            address: true,
        },
    });

    const validLeadIds = leads.filter((lead) => !!lead.address).map((lead) => lead.id);
    if (validLeadIds.length === 0) {
        return { success: false, error: 'None of the selected leads have a mailing address.' };
    }

    const cost = calculateMailCost(template.size as MailSize, validLeadIds.length);

    const campaign = await prisma.mailCampaign.create({
        data: {
            orgId,
            templateId: template.id,
            name,
            targetType: 'CUSTOM',
            targetLeadIds: validLeadIds as unknown as Prisma.InputJsonValue,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
            postageClass,
            mailType: template.type,
            mailSize: template.size,
            costCents: cost.totalCustomerCents,
            status: input.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        },
    });

    revalidatePath('/dashboard/mail');
    return { success: true, campaignId: campaign.id };
}

export async function createMailTemplate(data: {
    name: string;
    frontHeadline: string;
    frontBody: string;
    backHeadline?: string;
    backBody: string;
    ctaText?: string;
    accentColor?: string;
    imageUrl?: string;
    size?: '4X6' | '6X9';
}) {
    const orgId = await ensureOrganization();
    if (!orgId) return { success: false, error: 'Unauthorized.' };

    const imageUrl = data.imageUrl?.trim() || null;
    if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
        return { success: false, error: 'Background image must be a valid http or https URL.' };
    }

    const template = await prisma.mailTemplate.create({
        data: {
            orgId,
            name: data.name.trim(),
            type: 'POSTCARD',
            size: data.size || '4X6',
            frontHeadline: data.frontHeadline.trim(),
            frontBody: data.frontBody.trim(),
            backHeadline: data.backHeadline?.trim() || null,
            backBody: data.backBody.trim(),
            ctaText: data.ctaText?.trim() || null,
            accentColor: data.accentColor?.trim() || '#2563EB',
            imageUrl,
        },
    });

    revalidatePath('/dashboard/mail');
    return { success: true, templateId: template.id };
}

export async function cancelMailCampaign(campaignId: string) {
    const orgId = await ensureOrganization();
    if (!orgId) return { success: false, error: 'Unauthorized.' };

    await prisma.mailCampaign.updateMany({
        where: { id: campaignId, orgId },
        data: { status: 'CANCELLED' },
    });

    revalidatePath('/dashboard/mail');
    return { success: true };
}

export async function sendMailCampaign(campaignId: string) {
    const orgId = await ensureOrganization();
    if (!orgId) return { success: false, error: 'Unauthorized.' };

    try {
        const mode = getDirectMailMode();
        if (mode === 'live') {
            return { success: false, error: 'Use Stripe checkout before sending a live direct mail campaign.' };
        }

        const result = await processMailCampaignSend(orgId, campaignId);
        revalidatePath('/dashboard/mail');
        return result;
    } catch (error) {
        console.error('sendMailCampaign failed unexpectedly.', error);
        return {
            success: false,
            error: error instanceof Error ? `Direct mail send failed: ${error.message}` : 'Direct mail send failed unexpectedly.',
        };
    }
}

export async function createDirectMailCheckoutSession(campaignId: string) {
    const orgId = await ensureOrganization();
    if (!orgId) return { success: false, error: 'Unauthorized.' };

    const campaign = await prisma.mailCampaign.findFirst({
        where: { id: campaignId, orgId },
        include: {
            organization: {
                include: {
                    users: {
                        select: {
                            email: true,
                        },
                        take: 1,
                    },
                },
            },
            template: {
                select: {
                    size: true,
                },
            },
        },
    });

    if (!campaign) return { success: false, error: 'Campaign not found.' };

    const senderProfile = {
        name: campaign.organization.mailFromName,
        company: campaign.organization.mailFromCompany,
        addressLine1: campaign.organization.mailAddressLine1,
        addressLine2: campaign.organization.mailAddressLine2,
        city: campaign.organization.mailCity,
        state: campaign.organization.mailState,
        zip: campaign.organization.mailZip,
    };

    if (!hasCompleteSenderProfile(senderProfile)) {
        return { success: false, error: 'Complete your organization sender profile before checkout.' };
    }

    const leadIds = Array.isArray(campaign.targetLeadIds) ? campaign.targetLeadIds.filter((value): value is string => typeof value === 'string') : [];
    if (leadIds.length === 0) {
        return { success: false, error: 'This campaign has no target leads.' };
    }

    if (getDirectMailMode() !== 'live') {
        return { success: false, error: 'Stripe checkout is only required for live Lob dispatch.' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trendcast.io';
    const customerEmail = campaign.organization.users[0]?.email || undefined;
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        billing_address_collection: 'required',
        customer_email: customerEmail,
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: 'usd',
                    unit_amount: campaign.costCents,
                    product_data: {
                        name: `Direct Mail Campaign: ${campaign.name}`,
                        description: `${leadIds.length} ${campaign.template.size} postcard mailer${leadIds.length === 1 ? '' : 's'}`,
                    },
                },
            },
        ],
        success_url: `${appUrl}/dashboard/mail?mailPayment=success&campaign=${campaign.id}`,
        cancel_url: `${appUrl}/dashboard/mail?mailPayment=cancelled&campaign=${campaign.id}`,
        client_reference_id: orgId,
        metadata: {
            directMailCampaignId: campaign.id,
            orgId,
        },
    });

    await prisma.mailCampaign.update({
        where: { id: campaign.id },
        data: {
            stripeCheckoutId: session.id,
            stripePaymentStatus: 'PENDING',
            status: 'READY_TO_SEND',
        },
    });

    return { success: true, url: session.url };
}
