'use server';

import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ensureUserOrganizationByEmail } from '@/lib/organizationProvisioning';

// Get the NextAuth session server-side
export async function getSession() {
    return await getServerSession(authOptions);
}

// Function to auto-generate an Organization if a new Google User logs in without one
export async function ensureOrganization() {
    const session = await getSession();
    if (!session?.user) {
        return null;
    }

    const userEmail = session.user.email;
    if (!userEmail) {
        return null;
    }

    try {
        return await ensureUserOrganizationByEmail(userEmail);
    } catch (e) {
        console.error('ensureOrganization: FAILED ->', e);
        return null;
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
                extracts: 20,
                credits: 100,
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
