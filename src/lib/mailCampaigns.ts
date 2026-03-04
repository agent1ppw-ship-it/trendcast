import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
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

type MailSize = '4X6' | '6X9' | '8_5X11';

export type MailCampaignSendResult = {
    success: boolean;
    sentCount?: number;
    failedCount?: number;
    mode?: 'live' | 'demo';
    lobEnvironment?: 'demo' | 'test' | 'live';
    message?: string;
    error?: string;
};

export async function processMailCampaignSend(orgId: string, campaignId: string): Promise<MailCampaignSendResult> {
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
    const createdLobIds: string[] = [];
    const lobErrors: string[] = [];
    const skippedAddressErrors: string[] = [];

    const existingOrders = await prisma.mailOrder.findMany({
        where: {
            campaignId: campaign.id,
            orgId,
        },
        select: {
            id: true,
        },
    });

    if (existingOrders.length > 0) {
        await prisma.$transaction([
            prisma.mailTrackingEvent.deleteMany({
                where: {
                    orderId: {
                        in: existingOrders.map((order) => order.id),
                    },
                },
            }),
            prisma.mailOrder.deleteMany({
                where: {
                    id: {
                        in: existingOrders.map((order) => order.id),
                    },
                },
            }),
        ]);
    }

    await prisma.mailCampaign.update({
        where: { id: campaign.id },
        data: {
            status: 'SENDING',
        },
    });

    for (const lead of leads) {
        if (!lead.address) {
            failedCount += 1;
            skippedAddressErrors.push(`Lead "${lead.name}" is missing an address.`);
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
        if (!recipient) {
            skippedAddressErrors.push(`Lead "${lead.name}" does not have a mail-ready address: ${lead.address}`);
        }

        let deliverable = !!recipient;
        let standardizedAddress = lead.address;
        let recipientCity = localParsed.city || null;
        let recipientState = localParsed.state || null;
        let recipientZip = localParsed.zip || null;
        let lobVerificationId: string | null = null;

        if (recipient && mode === 'live' && lobEnvironment === 'live') {
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
                if (error instanceof Error) {
                    lobErrors.push(error.message);
                }
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
                    lobEnvironment,
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
                    mailType: campaign.mailSize === '4X6' || campaign.postageClass === 'FIRST_CLASS' ? 'FIRST_CLASS' : 'MARKETING',
                    description: `${campaign.name} / ${lead.name}`,
                });
                lobObjectId = lobMailPiece.id;
                lobTrackingId = lobMailPiece.trackingId;
                if (lobObjectId) {
                    lobCreatedCount += 1;
                    createdLobIds.push(lobObjectId);
                }
            } catch (error) {
                console.error('Lob postcard creation failed.', error);
                if (error instanceof Error) {
                    lobErrors.push(error.message);
                }
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
                    lobError: orderStatus === 'FAILED' ? lobErrors[lobErrors.length - 1] || null : null,
                } as Prisma.InputJsonValue,
            },
        });
    }

    const nextStatus = sentCount > 0 ? 'COMPLETED' : 'FAILED';

    await prisma.mailCampaign.update({
        where: { id: campaign.id },
        data: {
            status: nextStatus,
            sentCount,
            failedCount,
        },
    });

    if (mode === 'live' && lobCreatedCount === 0) {
        return {
            success: false,
            sentCount,
            failedCount,
            mode,
            lobEnvironment,
            error: lobErrors[0]
                ? `Lob rejected this campaign: ${lobErrors[0]}`
                : skippedAddressErrors[0]
                    ? skippedAddressErrors[0]
                    : 'Lob did not accept any mail pieces for this campaign. Check the sender profile, recipient addresses, and Lob account environment.',
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
                ? `Campaign submitted to Lob test mode. ${lobCreatedCount} mail piece(s) created.${createdLobIds.length ? ` Lob IDs: ${createdLobIds.slice(0, 3).join(', ')}${createdLobIds.length > 3 ? '...' : ''}` : ''}`
                : `Campaign submitted to Lob live mode. ${lobCreatedCount} mail piece(s) created.${createdLobIds.length ? ` Lob IDs: ${createdLobIds.slice(0, 3).join(', ')}${createdLobIds.length > 3 ? '...' : ''}` : ''}`
            : 'Campaign processed in demo mode. Add a Lob API key to create real mail pieces.',
    };
}
