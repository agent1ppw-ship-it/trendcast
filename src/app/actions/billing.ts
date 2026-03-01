'use server';

import Stripe from 'stripe';
import { ensureOrganization } from '@/app/actions/auth';

import { prisma } from '@/lib/prisma';

// Initialize Stripe with the standard secret key (we'll use a local mock or the user's live key later)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_123', {
    apiVersion: '2026-02-25.clover',
});

const PRICE_IDS = {
    'INTRO': process.env.STRIPE_PRICE_INTRO || 'price_mock_intro_3499',
    'PRO': process.env.STRIPE_PRICE_PRO || 'price_mock_pro_14999',
    'ULTIMATE': process.env.STRIPE_PRICE_ULTIMATE || 'price_mock_ultimate_39999'
};

export async function createCheckoutSession(tier: 'INTRO' | 'PRO' | 'ULTIMATE') {
    try {
        const orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized. Please sign in.' };

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: { users: true }
        });

        if (!org || org.users.length === 0) {
            return { success: false, error: 'Active Organization profile not found.' };
        }

        const activeEmail = org.users[0].email || undefined;
        const priceId = PRICE_IDS[tier];

        let checkoutSession;

        if (org.stripeSubscriptionId && org.stripeCustomerId) {
            // Prorated Upgrade Route for Existing Subscribers
            checkoutSession = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                customer: org.stripeCustomerId,
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                subscription_update: {
                    subscription: org.stripeSubscriptionId,
                    proration_behavior: 'always_invoice',
                },
                success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://trendcast.io'}/dashboard?payment=success`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://trendcast.io'}/dashboard?payment=cancelled`,
                client_reference_id: orgId,
                metadata: {
                    tierUpgrade: tier
                }
            });
        } else {
            // Standard New Subscription Route
            checkoutSession = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                billing_address_collection: 'required',
                customer_email: activeEmail,
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                mode: 'subscription',
                success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://trendcast.io'}/dashboard?payment=success`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://trendcast.io'}/dashboard?payment=cancelled`,
                client_reference_id: orgId,
                metadata: {
                    tierUpgrade: tier
                }
            });
        }

        if (!checkoutSession.url) {
            throw new Error('Stripe returned an empty session URL.');
        }

        return { success: true, url: checkoutSession.url };

    } catch (error: any) {
        console.error('Failed to create Stripe checkout session:', error);
        return { success: false, error: error?.message || 'Unknown billing error.' };
    }
}
