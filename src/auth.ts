import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getUserAuthContextByEmail } from '@/lib/organizationProvisioning';

const providers = [];

async function syncGoogleUser(user: { email?: string | null; name?: string | null; image?: string | null }) {
    const normalizedEmail = user.email?.trim().toLowerCase();
    if (!normalizedEmail) {
        return null;
    }

    const existingUser = await prisma.user.findFirst({
        where: {
            email: {
                equals: normalizedEmail,
                mode: 'insensitive',
            },
        },
    });

    if (existingUser) {
        await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                email: normalizedEmail,
                name: user.name ?? existingUser.name,
                image: user.image ?? existingUser.image,
                emailVerified: existingUser.emailVerified ?? new Date(),
            },
        });

        return existingUser.id;
    }

    const createdUser = await prisma.user.create({
        data: {
            email: normalizedEmail,
            name: user.name ?? normalizedEmail.split('@')[0],
            image: user.image ?? null,
            emailVerified: new Date(),
            role: 'USER',
        },
    });

    return createdUser.id;
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email?.toLowerCase() || null,
                    image: profile.picture,
                    emailVerified: profile.email_verified ? new Date() : null,
                    role: 'USER',
                    orgId: null,
                };
            },
        })
    );
}

providers.push(
    CredentialsProvider({
        name: 'Email and Password',
        credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
            const email = credentials?.email?.trim().toLowerCase();
            const password = credentials?.password;

            if (!email || !password) return null;

            const user = await prisma.user.findUnique({
                where: { email },
            });

            if (!user?.passwordHash) return null;

            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid || !user.email) return null;

            return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
                orgId: user.orgId,
            };
        },
    })
);

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    providers,
    session: {
        strategy: 'jwt',
    },
    debug: true,
    callbacks: {
        async signIn({ user, account }) {
            if (!user.email) {
                return false;
            }

            if (account?.provider === 'google') {
                try {
                    await syncGoogleUser({
                        email: user.email,
                        name: user.name,
                        image: user.image,
                    });
                } catch (error) {
                    console.error('--- GOOGLE USER SYNC FAILED ---', error);
                    return false;
                }
            }

            return true;
        },
        async redirect({ url, baseUrl }) {
            console.log('--- REDIRECT FIRED ---', { url, baseUrl });
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl + '/dashboard';
        },
        async jwt({ token, user, account }) {
            console.log('--- JWT CALLBACK FIRED ---');
            console.log('User:', user);
            console.log('Account:', account);

            // First time login, user object is provided
            if (user) {
                token.id = user.id;
                token.role = user.role || 'USER';
                token.orgId = user.orgId ?? null;
            }

            if (token.email) {
                try {
                    const authContext = await getUserAuthContextByEmail(token.email);
                    if (authContext) {
                        token.id = authContext.id;
                        token.role = authContext.role;
                        token.orgId = authContext.orgId;
                    }
                } catch (error) {
                    console.error('--- JWT AUTH CONTEXT LOOKUP FAILED ---', error);
                }
            }

            return token;
        },
        async session({ session, token }) {
            console.log('--- SESSION CALLBACK FIRED ---');
            console.log('Session User:', session.user);
            console.log('Token:', token);

            if (session.user) {
                session.user.id = token.id || '';
                session.user.role = token.role || 'USER';
                session.user.orgId = token.orgId ?? null;
            }
            return session;
        }
    },
    pages: {
        signIn: '/signup',
    }
};
