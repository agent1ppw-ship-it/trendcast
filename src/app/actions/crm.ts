'use server';

import { revalidatePath } from 'next/cache';

import { ensureOrganization } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';

export async function updateLeadStatus(leadId: string, newStatus: string) {
    try {
        // In a real app, verify user session here
        await prisma.lead.update({
            where: { id: leadId },
            data: { status: newStatus },
        });

        // Invalidate the cache for the CRM page so it refetches the latest leads
        revalidatePath('/dashboard/crm');
        return { success: true };
    } catch (error) {
        console.error('Failed to update lead status:', error);
        return { success: false, error: 'Failed to update lead status in database.' };
    }
}

export async function deleteLead(leadId: string) {
    try {
        await prisma.lead.delete({
            where: { id: leadId },
        });

        // Invalidate the cache for the CRM page so it refetches the latest leads
        revalidatePath('/dashboard/crm');
        revalidatePath('/dashboard/leads'); // Also revalidate scraper queue since they share the table
        return { success: true };
    } catch (error) {
        console.error('Failed to delete lead:', error);
        return { success: false, error: 'Failed to delete lead from database.' };
    }
}

export async function createLead(data: { name: string; phone: string; address: string; source: string }) {
    try {
        const orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized. Please sign in.' };

        await prisma.lead.create({
            data: {
                orgId,
                name: data.name,
                phone: data.phone || null,
                address: data.address || null,
                source: data.source,
                status: 'NEW',
            }
        });

        revalidatePath('/dashboard/crm');
        revalidatePath('/dashboard/businesses');
        return { success: true };
    } catch (error) {
        console.error('Failed to create lead:', error);
        return { success: false, error: 'Database connection failed when creating Lead.' };
    }
}
