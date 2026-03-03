import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inferMailOrderStatusFromLobEvent, verifyLobWebhookSignature } from '@/lib/directMail';

export const dynamic = 'force-dynamic';

type LobWebhookPayload = {
    type?: string;
    event_type?: string;
    body?: {
        event_type?: string;
        id?: string;
        object?: { id?: string };
        resource?: { id?: string };
    };
    data?: {
        id?: string;
        object?: { id?: string };
        resource?: { id?: string };
    };
    id?: string;
    object?: { id?: string };
    resource?: { id?: string };
};

export async function POST(req: Request) {
    const rawBody = await req.text();
    const signature = req.headers.get('x-lob-signature');
    const timestamp = req.headers.get('x-lob-timestamp');
    const secret = process.env.LOB_WEBHOOK_SECRET || null;

    if (secret && !verifyLobWebhookSignature(rawBody, signature, timestamp, secret)) {
        return NextResponse.json({ error: 'Invalid Lob webhook signature.' }, { status: 401 });
    }

    let payload: LobWebhookPayload;

    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const eventType = payload.type || payload.event_type || payload.body?.event_type || 'unknown';
    const eventObject = payload.body || payload.data || payload;
    const lobObjectId = eventObject?.id || eventObject?.object?.id || eventObject?.resource?.id || null;

    if (!lobObjectId) {
        return NextResponse.json({ ok: true, skipped: true });
    }

    const order = await prisma.mailOrder.findFirst({
        where: {
            lobObjectId,
        },
    });

    if (!order) {
        return NextResponse.json({ ok: true, skipped: true });
    }

    const nextStatus = inferMailOrderStatusFromLobEvent(String(eventType).toLowerCase());

    await prisma.mailTrackingEvent.create({
        data: {
            orderId: order.id,
            eventType: String(eventType),
            eventData: payload,
        },
    });

    await prisma.mailOrder.update({
        where: { id: order.id },
        data: {
            status: nextStatus,
            sentAt: nextStatus === 'MAILED' ? new Date() : order.sentAt,
            deliveredAt: nextStatus === 'DELIVERED' ? new Date() : order.deliveredAt,
        },
    });

    return NextResponse.json({ received: true });
}
