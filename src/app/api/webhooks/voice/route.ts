import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inbound Voice AI hook (e.g. from Vapi.ai or Bland AI)
export async function POST(req: Request) {
    try {
        const payload = await req.json();

        // Vapi sends a function_call event when the AI voice agent triggers a tool
        if (payload.message?.type === 'function-call') {
            const functionCall = payload.message.functionCall;

            if (functionCall.name === 'book_appointment') {
                const { customer_name, property_address, preferred_time } = functionCall.parameters;

                console.log(`[Voice AI] Triggering dispatch for ${customer_name} at ${property_address}`);

                // 1. Dispatch & Routing Logic Mock
                // In reality, this would query Google Maps APIs to calculate drive times
                // from the preceding appointment on the tech's calendar.

                const isRouteEfficient = Math.random() > 0.2; // 80% chance the route fits the schedule

                if (!isRouteEfficient) {
                    return NextResponse.json({
                        results: [{
                            toolCallId: functionCall.id,
                            result: "The requested time is mechanically inefficient for the schedule. Propose either 2:00 PM or 4:00 PM instead."
                        }]
                    });
                }

                // 2. Save to CRM and Schedule Job
                // Using a default Org ID for the demo
                const demoOrg = await prisma.organization.findFirst();

                if (demoOrg) {
                    const newJob = await prisma.job.create({
                        data: {
                            orgId: demoOrg.id,
                            title: `Service call at ${property_address}`,
                            status: 'SCHEDULED',
                            scheduledFor: new Date(preferred_time), // Assumes ISO string
                        }
                    });

                    return NextResponse.json({
                        results: [{
                            toolCallId: functionCall.id,
                            result: `Success! Appointment booked definitively. Job ID: ${newJob.id}. Tell the customer our tech will text them when on the way.`
                        }]
                    });
                }
            }
        }

        // Default Vapi Server URL Response
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Voice Webhook] Error processing incoming call data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
