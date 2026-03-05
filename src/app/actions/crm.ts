'use server';

import { revalidatePath } from 'next/cache';

import { ensureOrganization } from '@/app/actions/auth';
import { prisma } from '@/lib/prisma';

export async function updateLeadStatus(leadId: string, newStatus: string) {
    try {
        const orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized' };

        const result = await prisma.lead.updateMany({
            where: { id: leadId, orgId },
            data: { status: newStatus },
        });
        if (result.count === 0) return { success: false, error: 'Lead not found' };

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
        const orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized' };

        const result = await prisma.lead.deleteMany({
            where: { id: leadId, orgId },
        });
        if (result.count === 0) return { success: false, error: 'Lead not found' };

        // Invalidate the cache for the CRM page so it refetches the latest leads
        revalidatePath('/dashboard/crm');
        revalidatePath('/dashboard/leads'); // Also revalidate scraper queue since they share the table
        return { success: true };
    } catch (error) {
        console.error('Failed to delete lead:', error);
        return { success: false, error: 'Failed to delete lead from database.' };
    }
}

export async function deleteLeadsBulk(leadIds: string[]) {
    try {
        const orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized' };

        const uniqueLeadIds = Array.from(
            new Set(
                leadIds
                    .map((id) => id.trim())
                    .filter(Boolean),
            ),
        );

        if (uniqueLeadIds.length === 0) {
            return { success: false, error: 'No customers selected.' };
        }

        const result = await prisma.lead.deleteMany({
            where: {
                orgId,
                id: { in: uniqueLeadIds },
            },
        });

        revalidatePath('/dashboard/customers');
        revalidatePath('/dashboard/crm');
        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/businesses');

        return { success: true, deletedCount: result.count };
    } catch (error) {
        console.error('Failed to bulk delete customers:', error);
        return { success: false, error: 'Failed to delete selected customers.' };
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

export async function updateLeadDetails(
    leadId: string,
    data: {
        name: string;
        phone: string | null;
        address: string | null;
        source: string;
        status: string;
        leadScore: number;
    }
) {
    try {
        const orgId = await ensureOrganization();
        if (!orgId) return { success: false, error: 'Unauthorized' };

        const normalizedName = data.name.trim();
        if (!normalizedName) {
            return { success: false, error: 'Name is required.' };
        }

        const normalizedScore = Number.isFinite(data.leadScore)
            ? Math.max(0, Math.min(100, Math.round(data.leadScore)))
            : 0;

        const result = await prisma.lead.updateMany({
            where: { id: leadId, orgId },
            data: {
                name: normalizedName,
                phone: data.phone?.trim() || null,
                address: data.address?.trim() || null,
                source: data.source.trim() || 'MANUAL',
                status: data.status.trim() || 'NEW',
                leadScore: normalizedScore,
            },
        });

        if (result.count === 0) return { success: false, error: 'Customer not found.' };

        revalidatePath('/dashboard/customers');
        revalidatePath('/dashboard/crm');
        revalidatePath('/dashboard/leads');
        revalidatePath('/dashboard/businesses');
        return { success: true };
    } catch (error) {
        console.error('Failed to update customer details:', error);
        return { success: false, error: 'Failed to update customer details.' };
    }
}
