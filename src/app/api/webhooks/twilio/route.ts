import { NextResponse } from 'next/server';
import { masterRouterPrompt } from '@/lib/ai/prompts';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// This route receives inbound SMS from Twilio and processes the intent
export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        // Twilio sends data as URL Encoded parameters
        const incomingMessage = formData.get('Body') as string;
        const senderNumber = formData.get('From') as string;
        const toTwilioNumber = formData.get('To') as string;
        const numMedia = formData.get('NumMedia');
        const hasImage = numMedia && parseInt(numMedia.toString()) > 0;

        console.log(`[Twilio Webhook] Received message from ${senderNumber}: "${incomingMessage}"`);

        // We locate which tenant (Business) owns this Twilio number
        const aiConfig = await prisma.aiConfig.findFirst({
            where: { twilioNumber: toTwilioNumber },
            include: { organization: true },
        });

        if (!aiConfig) {
            console.warn(`[Twilio Webhook] No AI config found for number ${toTwilioNumber}`);
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // Step 1: Call the Master Router to determine the intent category
        const intentClassification = await masterRouterPrompt(
            incomingMessage,
            aiConfig.organization.name,
            aiConfig.organization.industry,
            !!hasImage
        );

        if (!intentClassification) {
            return NextResponse.json({ error: 'Failed to classify intent' }, { status: 500 });
        }

        console.log(`[Master Router] Classified intent as: ${intentClassification.intent} with ${intentClassification.confidence_score}% confidence.`);

        // Step 2: Handoff to specialized prompts based on structured output
        switch (intentClassification.intent) {
            case 'NEW_LEAD':
                // Handoff to the Inbound Lead Qualification Prompt (The Closer)
                // triggerLeadQualificationFlow(senderNumber, incomingMessage, aiConfig.orgId);
                break;

            case 'VISUAL_ESTIMATE':
                // const imageUrl = formData.get('MediaUrl0') as string;
                // triggerVisualEstimateFlow(senderNumber, imageUrl, aiConfig.orgId);
                break;

            case 'COMPLAINT':
                // Alert the owner immediately via Slack/Email, don't auto-reply
                break;

            default:
                // Handle STATUS_UPDATE or GENERAL_FAQ via RAG knowledge base
                break;
        }

        // Return a standard 200 OK to Twilio so it stops retrying
        // The actual SMS response will be sent asynchronously via the Twilio Node.js SDK
        return NextResponse.json({ success: true, intent: intentClassification.intent });

    } catch (error) {
        console.error('[Twilio Webhook] Error processing incoming SMS:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
