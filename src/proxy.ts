import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
    const isProduction = process.env.NODE_ENV === 'production';

    // NextAuth sometimes needs an explicit secure-cookie hint on edge runtimes.
    const secureCookieExists = req.cookies.has('__Secure-next-auth.session-token');

    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: isProduction || secureCookieExists
    });

    if (!token) {
        return NextResponse.redirect(new URL('/signup', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
