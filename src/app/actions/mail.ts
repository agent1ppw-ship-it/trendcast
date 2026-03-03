'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ensureOrganization } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';
import {
    DEFAULT_MAIL_TEMPLATES,
    MAIL_PRICING,
    buildRecipientAddress,
    calculateMailCost,
    createLobPostcard,
    getDirectMailMode,
    getLobEnvironment,
    hasCompleteSenderProfile,
    parseAddressString,
    renderMailPreview,
    replaceMailMergeTags,
    verifyAddressWithLob,
} from '@/lib/directMail';

type MailSize = keyof typeof MAIL_PRICING;

type CampaignInput = {
    name: string;
    templateId: string;
    leadIds: string[];
    scheduledAt?: string | null;
    postageClass?: 'MARKETING' | 'FIRST_CLASS';
};

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
    const postageClass = input.postageClass || 'MARKETING';

    if (!name) return { success: false, error: 'Campaign name is required.' };
    if (leadIds.length === 0) return { success: false, error: 'Select at least one lead.' };

    const template = await prisma.mailTemplate.findFirst({
        where: { id: input.templateId, orgId },
    });

    if (!template) {
        return { success: false, error: 'Template not found.' };
    }

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
    size?: '4X6' | '6X9';
}) {
    const orgId = await ensureOrganization();
    if (!orgId) return { success: false, error: 'Unauthorized.' };

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

    const campaign = await prisma.mailCampaign.findFirst({
        where: { id: campaignId, orgId },
        include: {
            template: true,
            organization: {
                select: {
                    mailFromName: true,
                    mailFromCompany: true,
                    mailAddressLine1: true,
                    mailAddressLine2: true,
                    mailCity: true,
                    mailState: true,
                    mailZip: true,
                },
            },
        },
    });

    if (!campaign) return { success: false, error: 'Campaign not found.' };
    if (campaign.template.type !== 'POSTCARD') {
        return { success: false, error: 'This MVP currently supports postcards only.' };
    }

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
        return { success: false, error: 'Complete your organization sender profile before sending mail.' };
    }

    const leadIds = Array.isArray(campaign.targetLeadIds) ? campaign.targetLeadIds.filter((value): value is string => typeof value === 'string') : [];
    if (leadIds.length === 0) {
        return { success: false, error: 'This campaign has no target leads.' };
    }

    const leads = await prisma.lead.findMany({
        where: {
            orgId,
            id: { in: leadIds },
        },
    });

    const mode = getDirectMailMode();
    const lobEnvironment = getLobEnvironment();
    let sentCount = 0;
    let failedCount = 0;
    let lobCreatedCount = 0;

    await prisma.mailOrder.deleteMany({
        where: {
            campaignId: campaign.id,
            orgId,
        },
    });

    for (const lead of leads) {
        if (!lead.address) {
            failedCount += 1;
            await prisma.mailOrder.create({
                data: {
                    orgId,
                    campaignId: campaign.id,
                    leadId: lead.id,
                    recipientName: lead.name,
                    recipientAddress: '',
                    status: 'SKIPPED',
                    costCents: 0,
                },
            });
            continue;
        }

        const mergeLead = {
            name: lead.name,
            address: lead.address,
            source: lead.source,
            status: lead.status,
        };

        const localParsed = parseAddressString(lead.address);
        const recipient = buildRecipientAddress(mergeLead);

        let deliverable = !!recipient;
        let standardizedAddress = lead.address;
        let recipientCity = localParsed.city || null;
        let recipientState = localParsed.state || null;
        let recipientZip = localParsed.zip || null;
        let lobVerificationId: string | null = null;

        if (recipient && mode === 'live') {
            try {
                const verification = await verifyAddressWithLob(recipient);
                deliverable = verification.deliverable;
                standardizedAddress = verification.standardizedAddress || lead.address;
                recipientCity = verification.parsed.city || recipientCity;
                recipientState = verification.parsed.state || recipientState;
                recipientZip = verification.parsed.zip || recipientZip;
                lobVerificationId = verification.lobId;
            } catch (error) {
                console.error('Lob verification failed, falling back to best-effort parsing.', error);
            }
        }

        await prisma.addressVerification.create({
            data: {
                leadId: lead.id,
                originalAddress: lead.address,
                standardizedAddress,
                deliverable,
                lobId: lobVerificationId,
                metadata: {
                    mode,
                } as Prisma.InputJsonValue,
            },
        });

        if (!deliverable) {
            failedCount += 1;
            await prisma.mailOrder.create({
                data: {
                    orgId,
                    campaignId: campaign.id,
                    leadId: lead.id,
                    recipientName: lead.name,
                    recipientAddress: lead.address,
                    recipientCity,
                    recipientState,
                    recipientZip,
                    status: 'SKIPPED',
                    costCents: 0,
                },
            });
            continue;
        }

        const mergedPreview = renderMailPreview(campaign.template, mergeLead);
        const cost = calculateMailCost(campaign.mailSize as MailSize, 1);

        let orderStatus = mode === 'live' ? 'QUEUED' : 'PRINTING';
        let lobObjectId: string | null = null;
        let lobTrackingId: string | null = null;

        if (mode === 'live' && recipient) {
            try {
                const lobMailPiece = await createLobPostcard({
                    sender: senderProfile,
                    recipient,
                    frontHtml: mergedPreview.frontHtml,
                    backHtml: mergedPreview.backHtml,
                    size: campaign.mailSize === '6X9' ? '6X9' : '4X6',
                    mailType: campaign.postageClass === 'FIRST_CLASS' ? 'FIRST_CLASS' : 'MARKETING',
                    description: `${campaign.name} / ${lead.name}`,
                });
                lobObjectId = lobMailPiece.id;
                lobTrackingId = lobMailPiece.trackingId;
                if (lobObjectId) {
                    lobCreatedCount += 1;
                }
            } catch (error) {
                console.error('Lob postcard creation failed.', error);
                orderStatus = 'FAILED';
            }
        }

        if (orderStatus === 'FAILED') {
            failedCount += 1;
        } else {
            sentCount += 1;
        }

        const order = await prisma.mailOrder.create({
            data: {
                orgId,
                campaignId: campaign.id,
                leadId: lead.id,
                lobObjectId,
                lobTrackingId,
                recipientName: lead.name,
                recipientAddress: standardizedAddress,
                recipientCity,
                recipientState,
                recipientZip,
                status: orderStatus,
                sentAt: orderStatus === 'FAILED' ? null : new Date(),
                costCents: cost.totalCustomerCents,
            },
        });

        await prisma.mailTrackingEvent.create({
            data: {
                orderId: order.id,
                eventType: mode === 'live' ? `lob.${lobEnvironment}.created` : 'demo.created',
                eventData: {
                    previewFront: replaceMailMergeTags(campaign.template.frontHeadline, mergeLead),
                    previewBack: replaceMailMergeTags(campaign.template.backBody, mergeLead),
                    mode,
                    lobEnvironment,
                    lobObjectId,
                } as Prisma.InputJsonValue,
            },
        });
    }

    const nextStatus = sentCount > 0 && failedCount === 0
        ? 'COMPLETED'
        : sentCount > 0
            ? 'COMPLETED'
            : 'FAILED';

    await prisma.mailCampaign.update({
        where: { id: campaign.id },
        data: {
            status: nextStatus,
            sentCount,
            failedCount,
        },
    });

    revalidatePath('/dashboard/mail');

    if (mode === 'live' && lobCreatedCount === 0) {
        return {
            success: false,
            sentCount,
            failedCount,
            mode,
            lobEnvironment,
            error: 'Lob did not accept any mail pieces for this campaign. Check the sender profile, recipient addresses, and Lob account environment.',
        };
    }

    return {
        success: true,
        sentCount,
        failedCount,
        mode,
        lobEnvironment,
        message: mode === 'live'
            ? lobEnvironment === 'test'
                ? `Campaign submitted to Lob test mode. ${lobCreatedCount} mail piece(s) created.`
                : `Campaign submitted to Lob live mode. ${lobCreatedCount} mail piece(s) created.`
            : 'Campaign processed in demo mode. Add a Lob API key to create real mail pieces.',
    };
}
