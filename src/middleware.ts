import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const isProduction = process.env.NODE_ENV === 'production';

    // Check if the secure cookie exists explicitly as NextAuth doesn't always detect Cloudflare/Vercel edge HTTPS
    const secureCookieExists = req.cookies.has('__Secure-next-auth.session-token');

    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: isProduction || secureCookieExists
    });

    console.log('--- CUSTOM MIDDLEWARE EXECUTING ---');
    console.log('Requested URL:', req.nextUrl.pathname);
    console.log('Secure Cookie Exists?', secureCookieExists);
    console.log('Token Resolved By Custom Middleware?', !!token);

    if (!token) {
        return NextResponse.redirect(new URL('/signup', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
