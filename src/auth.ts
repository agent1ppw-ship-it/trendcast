import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
    // Cast adapter because of generic type mismatch between Prisma NextAuth packages, but it operates perfectly
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    debug: true,
    callbacks: {
        async jwt({ token, user, account }) {
            console.log('--- JWT CALLBACK FIRED ---');
            console.log('User:', user);
            console.log('Account:', account);

            // First time login, user object is provided
            if (user) {
                token.id = user.id;
                token.role = (user as any).role || 'USER';
                token.orgId = (user as any).orgId;
            }
            return token;
        },
        async session({ session, token }) {
            console.log('--- SESSION CALLBACK FIRED ---');
            console.log('Session User:', session.user);
            console.log('Token:', token);

            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).orgId = token.orgId;
            }
            return session;
        }
    },
    pages: {
        signIn: '/signup',
    }
};
