import { NextResponse } from 'next/server';
import { upsertMobileSocialUser } from '@/lib/mobileSocialAuth';

export const dynamic = 'force-dynamic';

type GoogleTokenInfo = {
  aud?: string;
  azp?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

function getAllowedGoogleAudiences() {
  const values = [
    process.env.MOBILE_GOOGLE_CLIENT_IDS,
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ]
    .filter(Boolean)
    .flatMap((entry) => (entry || '').split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set(values));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };
    const idToken = body.idToken?.trim();

    if (!idToken) {
      return NextResponse.json({ success: false, error: 'Google ID token is required.' }, { status: 400 });
    }

    const verificationResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { cache: 'no-store' },
    );

    if (!verificationResponse.ok) {
      return NextResponse.json({ success: false, error: 'Invalid Google token.' }, { status: 401 });
    }

    const tokenInfo = (await verificationResponse.json()) as GoogleTokenInfo;
    const email = tokenInfo.email?.trim().toLowerCase() || '';
    const emailVerified = tokenInfo.email_verified === 'true';

    if (!email || !emailVerified) {
      return NextResponse.json({ success: false, error: 'Google account email is not verified.' }, { status: 401 });
    }

    const allowedAudiences = getAllowedGoogleAudiences();
    if (allowedAudiences.length > 0 && (!tokenInfo.aud || !allowedAudiences.includes(tokenInfo.aud))) {
      return NextResponse.json({ success: false, error: 'Google token audience mismatch.' }, { status: 401 });
    }

    const session = await upsertMobileSocialUser({
      provider: 'google',
      providerAccountId: tokenInfo.sub || email,
      email,
      name: tokenInfo.name,
      image: tokenInfo.picture,
    });

    return NextResponse.json({
      success: true,
      token: session.token,
      user: session.user,
      organization: session.organization,
    });
  } catch (error) {
    console.error('Mobile Google auth failed:', error);
    return NextResponse.json({ success: false, error: 'Google sign in failed.' }, { status: 500 });
  }
}
