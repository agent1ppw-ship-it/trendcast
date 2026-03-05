import { NextResponse } from 'next/server';
import { buildInstantReplyMessage, normalizePhoneNumber, xmlEscape } from '@/lib/ai/autoReply';

export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';

function twimlResponse(message?: string) {
    const body = message ? `<Message>${xmlEscape(message)}</Message>` : '';
    const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
    return new NextResponse(xml, {
        status: 200,
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
}

// This route receives inbound SMS from Twilio and returns an instant auto-reply via TwiML.
export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        const incomingMessage = (formData.get('Body') as string | null)?.trim() || '';
        const senderNumber = (formData.get('From') as string | null)?.trim() || '';
        const toTwilioNumber = (formData.get('To') as string | null)?.trim() || '';

        console.log(`[Twilio Webhook] Received message from ${senderNumber}: "${incomingMessage}"`);

        const normalizedToNumber = normalizePhoneNumber(toTwilioNumber);
        let aiConfig = await prisma.aiConfig.findFirst({
            where: { twilioNumber: normalizedToNumber },
            include: { organization: true },
        });

        if (!aiConfig && normalizedToNumber) {
            const configs = await prisma.aiConfig.findMany({
                where: { twilioNumber: { not: null } },
                include: { organization: true },
            });
            aiConfig = configs.find((config) => normalizePhoneNumber(config.twilioNumber) === normalizedToNumber) || null;
        }

        if (!aiConfig) {
            console.warn(`[Twilio Webhook] No AI config found for number ${toTwilioNumber}`);
            return twimlResponse();
        }

        if (!aiConfig.autoReplySMS) {
            return twimlResponse();
        }

        if (!incomingMessage) {
            return twimlResponse();
        }

        const lowerMessage = incomingMessage.toLowerCase();
        if (['stop', 'unsubscribe', 'cancel', 'end', 'quit', 'stopall'].includes(lowerMessage)) {
            return twimlResponse();
        }

        const responseMessage = buildInstantReplyMessage(aiConfig.systemPrompt, {
            businessName: aiConfig.organization.name,
            industry: aiConfig.organization.industry,
            sender: senderNumber,
            inquiry: incomingMessage,
            timestamp: new Date().toISOString(),
        });

        return twimlResponse(responseMessage);

    } catch (error) {
        console.error('[Twilio Webhook] Error processing incoming SMS:', error);
        return twimlResponse();
    }
}
