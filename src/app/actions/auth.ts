'use server';

import { PrismaClient } from '@prisma/client';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// In production, this must be a strong environment variable (e.g., process.env.JWT_SECRET)
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'trendcast-local-dev-secret-key-12345');

export async function signUp(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { success: false, error: 'Email and password are required.' };
    }

    try {
        // 1. Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return { success: false, error: 'An account with this email already exists.' };
        }

        // 2. Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create mapping: Organization -> User (in a single transaction)
        const organization = await prisma.organization.create({
            data: {
                name: `${email.split('@')[0]}'s Business`,
                tier: 'INTRO',
                industry: 'Home Services',
                // Explicitly defining Free Trial defaults just to be safe
                extracts: 10,
                credits: 50,
                users: {
                    create: {
                        email,
                        password: hashedPassword,
                        role: 'ADMIN',
                    }
                },
                aiSettings: {
                    create: {
                        systemPrompt: 'You are a helpful home service estimator assistant.',
                        autoReplySMS: false,
                        autoSchedule: false,
                    }
                }
            },
            include: { users: true }
        });

        // 4. Generate JWT
        const userUserId = organization.users[0].id;

        const token = await new SignJWT({ userId: userUserId, orgId: organization.id, role: 'ADMIN' })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d') // 1 week session
            .sign(SECRET_KEY);

        // 5. Set HttpOnly Cookie
        const cookieStore = await cookies();
        cookieStore.set('trendcast_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return { success: true };
    } catch (error) {
        console.error('Signup error:', error);
        return { success: false, error: 'Failed to create account. Please try again later.' };
    }
}

// Helper to verify tokens server-side
export async function verifyAuth() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('trendcast_session')?.value;
    if (!sessionCookie) return null;

    try {
        const { payload } = await jwtVerify(sessionCookie, SECRET_KEY);
        return payload as { userId: string; orgId: string; role: string };
    } catch (err) {
        return null; // Invalid or expired token
    }
}

export async function logOut() {
    const cookieStore = await cookies();
    cookieStore.delete('trendcast_session');
}
