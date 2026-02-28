'use server';

import { revalidatePath } from 'next/cache';
import { enrichLead } from '@/lib/enrichment';

import { prisma } from '@/lib/prisma';

export async function revealLeadContact(leadId: string) {
    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { organization: true }
        });

        if (!lead) {
            return { success: false, error: 'Lead not found.' };
        }

        if (lead.isRevealed) {
            return { success: false, error: 'Lead is already revealed.' };
        }

        if (lead.organization.credits < 50) {
            return { success: false, error: 'Insufficient credits! Your free trial has ended. Subscribe to the Intro Tier for 500 more reveals.' };
        }

        if (!lead.address) {
            return { success: false, error: 'No address to run skip tracing on.' };
        }

        // Run the Skip Tracing enrichment API call on-demand to save credits
        const enrichedData = await enrichLead(lead.address);

        if (!enrichedData || enrichedData.ownerName === 'Unknown' || !enrichedData.mobileNumber) {
            return { success: false, error: 'Provider could not find a match for this property. No credits were deducted.' };
        }

        // Perform atomic transaction to deduct credits and reveal the lead
        await prisma.$transaction([
            prisma.organization.update({
                where: { id: lead.orgId },
                data: { credits: { decrement: 50 } }
            }),
            prisma.lead.update({
                where: { id: leadId },
                data: {
                    name: enrichedData.ownerName,
                    phone: enrichedData.mobileNumber,
                    isRevealed: true
                }
            })
        ]);

        revalidatePath('/dashboard/leads');
        return { success: true };

    } catch (error) {
        console.error('Failed to reveal lead:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}
