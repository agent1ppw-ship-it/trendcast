import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_123', {
    apiVersion: '2026-02-25.clover',
});

export const CONTRACTOR_WEBSITE_BUILD_PRICE_CENTS = 39900;

type WebsiteBuildCheckoutInput = {
    inquiryId: string;
    name: string;
    email: string;
    businessName: string;
    industry: string;
};

export async function createWebsiteBuildCheckoutSession(input: WebsiteBuildCheckoutInput) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trendcast.io';

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        billing_address_collection: 'required',
        customer_email: input.email,
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: 'usd',
                    unit_amount: CONTRACTOR_WEBSITE_BUILD_PRICE_CENTS,
                    product_data: {
                        name: 'Trendcast Contractor Website Build',
                        description: `Done-for-you mobile-optimized website build for ${input.businessName}`,
                    },
                },
            },
        ],
        success_url: `${appUrl}/contractor-websites?checkout=success`,
        cancel_url: `${appUrl}/contractor-websites?checkout=cancelled#website-build-inquiry`,
        metadata: {
            websiteBuildInquiryId: input.inquiryId,
            businessName: input.businessName,
            industry: input.industry,
            contactName: input.name,
            contactEmail: input.email,
            productType: 'CONTRACTOR_WEBSITE_BUILD',
        },
    });

    if (!session.url) {
        throw new Error('Stripe returned an empty checkout URL.');
    }

    return session;
}
