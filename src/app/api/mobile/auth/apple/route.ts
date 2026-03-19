import { NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { upsertMobileSocialUser } from '@/lib/mobileSocialAuth';

export const dynamic = 'force-dynamic';

const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

type AppleIdentityClaims = JWTPayload & {
    sub?: string;
    email?: string;
    email_verified?: string | boolean;
    aud?: string | string[];
};

function getAllowedAppleAudiences() {
    const values = [
        process.env.MOBILE_APPLE_CLIENT_IDS,
        process.env.APPLE_CLIENT_ID,
        process.env.APPLE_IOS_CLIENT_ID,
        process.env.APP_IOS_BUNDLE_IDENTIFIER,
        'io.trendcast.mobile',
    ]
        .filter(Boolean)
        .flatMap((entry) => (entry || '').split(','))
        .map((entry) => entry.trim())
        .filter(Boolean);

    return Array.from(new Set(values));
}

function normalizeName(value?: string | null) {
    return value?.trim() || null;
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as {
            idToken?: string;
            email?: string;
            name?: string;
            user?: string;
        };

        const idToken = body.idToken?.trim();
        if (!idToken) {
            return NextResponse.json({ success: false, error: 'Apple identity token is required.' }, { status: 400 });
        }

        const { payload } = await jwtVerify(idToken, appleJwks, {
            issuer: 'https://appleid.apple.com',
        });

        const claims = payload as AppleIdentityClaims;
        const subject = claims.sub?.trim();
        const allowedAudiences = getAllowedAppleAudiences();
        const audienceList = Array.isArray(claims.aud) ? claims.aud : [claims.aud].filter(Boolean);

        if (!subject) {
            return NextResponse.json({ success: false, error: 'Apple token is missing a subject.' }, { status: 401 });
        }

        if (allowedAudiences.length > 0 && !audienceList.some((aud) => aud && allowedAudiences.includes(aud))) {
            return NextResponse.json({ success: false, error: 'Apple token audience mismatch.' }, { status: 401 });
        }

        const email = claims.email?.trim().toLowerCase() || body.email?.trim().toLowerCase() || null;
        const session = await upsertMobileSocialUser({
            provider: 'apple',
            providerAccountId: subject,
            email,
            name: normalizeName(body.name),
            image: null,
        });

        return NextResponse.json({
            success: true,
            token: session.token,
            user: session.user,
            organization: session.organization,
        });
    } catch (error) {
        console.error('Mobile Apple auth failed:', error);
        return NextResponse.json({ success: false, error: 'Apple sign in failed.' }, { status: 500 });
    }
}
