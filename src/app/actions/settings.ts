'use server';

import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/app/actions/auth';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function getAiConfig() {
    const session = await verifyAuth();
    if (!session) return null;

    try {
        const config = await prisma.aiConfig.findUnique({
            where: { orgId: session.orgId }
        });
        return config;
    } catch (e) {
        console.error("Failed to fetch AI Config", e);
        return null;
    }
}

export async function saveAiConfig(data: any) {
    const session = await verifyAuth();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.aiConfig.upsert({
            where: { orgId: session.orgId },
            update: {
                autoReplySMS: data.autoReplySMS,
                autoSchedule: data.autoSchedule,
                twilioNumber: data.twilioNumber,
                systemPrompt: data.systemPrompt
            },
            create: {
                orgId: session.orgId,
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
