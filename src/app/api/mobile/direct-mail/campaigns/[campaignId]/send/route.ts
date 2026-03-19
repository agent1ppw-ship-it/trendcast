import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileAuthFromRequest } from '@/lib/mobileAuth';
import { getDirectMailMode, hasCompleteSenderProfile } from '@/lib/directMail';
import { processMailCampaignSend } from '@/lib/mailCampaigns';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_123', {
    apiVersion: '2026-02-25.clover',
});

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
    const auth = await getMobileAuthFromRequest(request);
    if (!auth) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId } = await params;
    const mode = getDirectMailMode();

    if (mode === 'live') {
        const campaign = await prisma.mailCampaign.findFirst({
            where: { id: campaignId, orgId: auth.orgId },
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

        if (!campaign) {
            return NextResponse.json({ success: false, error: 'Campaign not found.' }, { status: 404 });
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
            return NextResponse.json({ success: false, error: 'Complete your sender profile before checkout.' }, { status: 400 });
        }

        const leadIds = Array.isArray(campaign.targetLeadIds)
            ? campaign.targetLeadIds.filter((value): value is string => typeof value === 'string')
            : [];

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
            client_reference_id: auth.orgId,
            metadata: {
                directMailCampaignId: campaign.id,
                orgId: auth.orgId,
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

        return NextResponse.json({ success: true, requiresCheckout: true, checkoutUrl: session.url });
    }

    const result = await processMailCampaignSend(auth.orgId, campaignId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
