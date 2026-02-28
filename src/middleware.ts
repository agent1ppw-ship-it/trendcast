import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define the secret key used by signJWT
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'trendcast-local-dev-secret-key-12345');

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // We only want to protect routes that start with /dashboard
    if (pathname.startsWith('/dashboard')) {
        const sessionToken = request.cookies.get('trendcast_session')?.value;

        // If no token exists, redirect immediately to login/signup
        if (!sessionCookieOrToken(sessionToken)) {
            return NextResponse.redirect(new URL('/signup', request.url));
        }

        try {
            // Secret verification using Jose edge-compatible library
            await jwtVerify(sessionToken!, SECRET_KEY);
            return NextResponse.next();
        } catch (error) {
            // Token is invalid, expired, or tampered with
            const response = NextResponse.redirect(new URL('/signup', request.url));
            response.cookies.delete('trendcast_session'); // Clear the bad cookie
            return response;
        }
    }

    // Allow all other routes (like the Homepage)
    return NextResponse.next();
}

function sessionCookieOrToken(token: string | undefined): boolean {
    return token !== undefined && token !== '';
}

// Optimization array: Ensure the middleware only executes on matched paths
export const config = {
    matcher: ['/dashboard/:path*'],
};
