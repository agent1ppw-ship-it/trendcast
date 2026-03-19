import { jwtVerify, SignJWT } from 'jose';

export type MobileAuthContext = {
  userId: string;
  email: string;
  orgId: string;
  role: string;
};

type MobileTokenPayload = MobileAuthContext & {
  type: 'mobile';
};

function getMobileJwtSecret() {
  const secret = process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('Missing MOBILE_JWT_SECRET (or NEXTAUTH_SECRET)');
  }

  return new TextEncoder().encode(secret);
}

export async function signMobileToken(context: MobileAuthContext) {
  const payload: MobileTokenPayload = {
    ...context,
    type: 'mobile',
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getMobileJwtSecret());
}

export async function verifyMobileToken(token: string): Promise<MobileAuthContext | null> {
  try {
    const { payload } = await jwtVerify(token, getMobileJwtSecret());

    if (
      payload.type !== 'mobile' ||
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.orgId !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      orgId: payload.orgId,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function getMobileAuthFromRequest(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = header.slice(7).trim();
  if (!token) return null;

  return verifyMobileToken(token);
}
