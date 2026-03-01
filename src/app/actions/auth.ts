'use server';

import bcrypt from 'bcryptjs';
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
    } catch (e) {
        console.error("ensureOrganization: FATAL DB CRASH ->", e);
        return null; // The redirect will trigger
    }
}

export async function registerWithEmailPassword(data: {
    name: string;
    email: string;
    password: string;
}) {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;

    if (!name || !email || !password) {
        return { success: false, error: 'Name, email, and password are required.' };
    }

    if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters.' };
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser?.passwordHash) {
        return { success: false, error: 'An account with this email already exists.' };
    }

    if (existingUser && !existingUser.passwordHash) {
        return {
            success: false,
            error: 'This email is already linked to a social login. Use Google sign-in for this account.',
        };
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);
        const businessBaseName = name || email.split('@')[0];

        await prisma.organization.create({
            data: {
                name: `${businessBaseName}'s Business`,
                tier: 'INTRO',
                industry: 'Home Services',
                extracts: 10,
                credits: 50,
                users: {
                    create: {
                        name,
                        email,
                        passwordHash,
                        role: 'ADMIN',
                    },
                },
                aiSettings: {
                    create: {
                        systemPrompt: 'You are a helpful home service estimator assistant.',
                        autoReplySMS: false,
                        autoSchedule: false,
                    },
                },
            },
        });

        return { success: true };
    } catch (error) {
        console.error('registerWithEmailPassword: FAILED ->', error);
        return { success: false, error: 'Failed to create your account.' };
    }
}
