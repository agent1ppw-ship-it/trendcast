'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get the NextAuth session server-side
export async function getSession() {
    return await getServerSession(authOptions);
}

// Function to auto-generate an Organization if a new Google User logs in without one
export async function ensureOrganization() {
    const session = await getSession();

    // Not logged in
    if (!session?.user) return null;

    const userEmail = session.user.email;
    if (!userEmail) return null;

    const user = await prisma.user.findUnique({ where: { email: userEmail } });

    if (!user) return null;

    // If the user already has an org, return it
    if (user.orgId) return user.orgId;

    // Otherwise, they just signed up via Google! Create their Free Trial Org.
    const organization = await prisma.organization.create({
        data: {
            name: `${userEmail.split('@')[0]}'s Business`,
            tier: 'INTRO',
            industry: 'Home Services',
            extracts: 10,
            credits: 50,
            aiSettings: {
                create: {
                    systemPrompt: 'You are a helpful home service estimator assistant.',
                    autoReplySMS: false,
                    autoSchedule: false,
                }
            }
        }
    });

    // Link the new Google User to this Orgniazation
    await prisma.user.update({
        where: { id: user.id },
        data: { orgId: organization.id, role: 'ADMIN' }
    });

    return organization.id;
}
