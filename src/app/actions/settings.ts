'use server';

import { ensureOrganization } from '@/app/actions/auth';
import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/prisma';

export async function getAiConfig() {
    const orgId = await ensureOrganization();
    if (!orgId) return null;

    try {
        const config = await prisma.aiConfig.findUnique({
            where: { orgId }
        });
        return config;
    } catch (e) {
        console.error("Failed to fetch AI Config", e);
        return null;
    }
}

export async function saveAiConfig(data: any) {
    const orgId = await ensureOrganization();
    if (!orgId) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.aiConfig.upsert({
            where: { orgId },
            update: {
                autoReplySMS: data.autoReplySMS,
                autoSchedule: data.autoSchedule,
                twilioNumber: data.twilioNumber,
                systemPrompt: data.systemPrompt
            },
            create: {
                orgId,
                autoReplySMS: data.autoReplySMS,
                autoSchedule: data.autoSchedule,
                twilioNumber: data.twilioNumber,
                systemPrompt: data.systemPrompt
            }
        });

        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to save settings:', error);
        return { success: false, error: 'Failed to save settings' };
    }
}
