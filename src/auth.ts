import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
    // Cast adapter because of generic type mismatch between Prisma NextAuth packages, but it operates correctly.
    adapter: PrismaAdapter(prisma) as never,
    secret: process.env.NEXTAUTH_SECRET,
    providers,
    session: {
        strategy: 'jwt',
    },
    debug: true,
    callbacks: {
        async redirect({ url, baseUrl }) {
            console.log('--- REDIRECT FIRED ---', { url, baseUrl });
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl + '/dashboard/crm';
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
