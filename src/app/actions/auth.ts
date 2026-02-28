'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

// Get the NextAuth session server-side
export async function getSession() {
    return await getServerSession(authOptions);
}

// Function to auto-generate an Organization if a new Google User logs in without one
export async function ensureOrganization() {
    const session = await getSession();
    console.log("--- ensureOrganization: SESSION ---", session);

    // Not logged in
    if (!session?.user) {
        console.log("ensureOrganization: FAILED - No session.user");
        return null;
    }

    const userEmail = session.user.email;
    if (!userEmail) {
        console.log("ensureOrganization: FAILED - No user email");
        return null;
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    console.log("ensureOrganization: DB USER ->", user);

    if (!user) {
        console.log("ensureOrganization: FAILED - User not found in database");
        return null;
    }

    // If the user already has an org, return it
    if (user.orgId) {
        console.log("ensureOrganization: SUCCESS - User already has org ->", user.orgId);
        return user.orgId;
    }

    try {
        console.log("ensureOrganization: Creating new Organization for user...");
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

        console.log("ensureOrganization: SUCCESS - Created and linked new org ->", organization.id);
        return organization.id;
    } catch (e: any) {
        console.error("ensureOrganization: FATAL DB CRASH ->", e);
        return null; // The redirect will trigger
    }
}
