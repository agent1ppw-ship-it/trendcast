import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_123', {
    apiVersion: '2026-02-25.clover',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_123';

export async function POST(req: Request) {
    const bodyText = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(bodyText, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        const orgId = session.client_reference_id;
        const tierUpgrade = session.metadata?.tierUpgrade;

        if (!orgId || !tierUpgrade) {
            console.error('Webhook missing crucial metadata (orgId or tierUpgrade)', session.id);
            return NextResponse.json({ success: true, warning: 'Missing routing metadata' });
        }

        try {
            let extractsToAdd = 0;
            let creditsToAdd = 0;

            if (tierUpgrade === 'INTRO') {
                extractsToAdd = 100;
                creditsToAdd = 500;
            } else if (tierUpgrade === 'PRO') {
                extractsToAdd = 1000;
                creditsToAdd = 5000;
            } else if (tierUpgrade === 'ULTIMATE') {
                // Large arbitrary numbers to simulate "Unlimited" limits while keeping integer logic
                extractsToAdd = 1000000;
                creditsToAdd = 25000;
            }

            await prisma.organization.update({
                where: { id: orgId },
                data: {
                    tier: tierUpgrade,
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
