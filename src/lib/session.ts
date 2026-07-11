import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'jm_session';

const alg = 'HS256';

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(value);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
