import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { processMailCampaignSend } from '@/lib/mailCampaigns';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_123', {
    apiVersion: '2026-02-25.clover',
});

// For Vercel Edge/Serverless environments, always evaluate secrets directly
const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_123';

export async function POST(req: Request) {
    const bodyText = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(bodyText, sig, getWebhookSecret());
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown webhook error';
        console.error(`Webhook signature verification failed: ${message}`);
        return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const directMailCampaignId = session.metadata?.directMailCampaignId;
        const orgId = session.client_reference_id;

        if (directMailCampaignId && orgId) {
            try {
                await prisma.mailCampaign.update({
                    where: { id: directMailCampaignId },
                    data: {
                        stripeCheckoutId: session.id,
                        stripePaymentStatus: 'PAID',
                    },
                });

                const result = await processMailCampaignSend(orgId, directMailCampaignId);

                if (!result.success) {
                    await prisma.mailCampaign.update({
                        where: { id: directMailCampaignId },
                        data: {
                            stripePaymentStatus: 'PAID_SEND_FAILED',
                            status: 'FAILED',
                        },
                    });
                    console.error('Direct mail campaign failed after payment:', result.error);
                } else {
                    await prisma.mailCampaign.update({
                        where: { id: directMailCampaignId },
                        data: {
                            stripePaymentStatus: 'PAID_SENT',
                        },
                    });
                }
            } catch (error) {
                console.error('Failed to process paid direct mail campaign:', error);
                return NextResponse.json({ error: 'Direct mail campaign processing failed' }, { status: 500 });
            }

            return NextResponse.json({ received: true });
        }

        const tierUpgrade = session.metadata?.tierUpgrade;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!orgId || !tierUpgrade) {
            console.error('Webhook missing crucial metadata (orgId or tierUpgrade)', session.id);
            return NextResponse.json({ success: true, warning: 'Missing routing metadata' });
        }

        try {
            let extractsToAdd = 0;
            let creditsToAdd = 0;

            if (tierUpgrade === 'INTRO') {
                extractsToAdd = 250;
                creditsToAdd = 2500;
            } else if (tierUpgrade === 'PRO') {
                extractsToAdd = 2000;
                creditsToAdd = 10000;
            } else if (tierUpgrade === 'ULTIMATE') {
                // Large arbitrary numbers to simulate "Unlimited" limits while keeping integer logic
                extractsToAdd = 1000000;
                creditsToAdd = 25000;
            }

            await prisma.organization.update({
                where: { id: orgId },
                data: {
                    tier: tierUpgrade,
                    stripeCustomerId: stripeCustomerId || undefined,
                    stripeSubscriptionId: stripeSubscriptionId || undefined,
                    extracts: { increment: extractsToAdd },
                    credits: { increment: creditsToAdd },
                }
            });
            console.log(`[Stripe Webhook] Successfully upgraded Org ${orgId} to ${tierUpgrade}`);

        } catch (error) {
            console.error('Failed to update Organization record via webhook:', error);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }
    }

    return NextResponse.json({ received: true });
}
