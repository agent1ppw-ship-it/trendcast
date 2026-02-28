'use server';

import Stripe from 'stripe';
import { ensureOrganization } from '@/app/actions/auth';

import { prisma } from '@/lib/prisma';

// Initialize Stripe with the standard secret key (we'll use a local mock or the user's live key later)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_123', {
    apiVersion: '2026-02-25.clover',
});

const PRICE_IDS = {
    'INTRO': 'price_mock_intro_3499', // 100 Extracts, 500 Credits
    'PRO': 'price_mock_pro_14999', // 1,000 Extracts, 5,000 Credits
    'ULTIMATE': 'price_mock_ultimate_39999' // Unlimited Extracts, 25,000 Credits
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

        // Create the highly secure Stripe Checkout server session
        const checkoutSession = await stripe.checkout.sessions.create({
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
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=cancelled`,
            client_reference_id: orgId,
            metadata: {
                tierUpgrade: tier // Stored securely on Stripe's end so the webhook knows what to provision
            }
        });

        if (!checkoutSession.url) {
            throw new Error('Stripe returned an empty session URL.');
        }

        return { success: true, url: checkoutSession.url };

    } catch (error) {
        console.error('Failed to create Stripe checkout session:', error);
        return { success: false, error: 'External billing error. Please try again later.' };
    }
}
