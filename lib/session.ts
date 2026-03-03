import { SignJWT, jwtVerify } from 'jose';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';

const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-session-secret';
const encoder = new TextEncoder();
const secretKey = encoder.encode(SECRET);

export type SessionPayload = {
  userId: string;
  role?: string;
  permissionVersion?: string;
  activeOrgId?: string;
  iat?: number;
  exp?: number;
};

export async function signSession(payload: SessionPayload, expiresIn = '7d') {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey as Uint8Array);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey as Uint8Array);
    return payload as unknown as SessionPayload;
  } catch (err) {
    return null;
  }
}

export async function getSessionFromRequest(request: Request | { cookies?: any } | { headers?: any }) {
  let token: string | undefined;
  try {
    // @ts-ignore
    if (request.cookies && typeof request.cookies.get === 'function') {
      // NextRequest
      // @ts-ignore
      token = request.cookies.get(COOKIE_NAMES.SESSION_TOKEN)?.value;
    }
  } catch (e) {
    // ignore
  }

  if (!token) {
    try {
      // Try headers
      // @ts-ignore
      const headers = request.headers;
      const raw = headers?.get ? headers.get('cookie') : undefined;
      if (raw) {
        const match = raw.match(new RegExp(COOKIE_NAMES.SESSION_TOKEN + '=([^;]+)'));
        if (match) token = decodeURIComponent(match[1]);
      }

      // Support Authorization: Bearer <token>
      if (!token) {
        const auth = headers?.get ? headers.get('authorization') : undefined;
        if (auth && auth.toLowerCase().startsWith('bearer ')) {
          token = auth.slice(7).trim();
        }
      }

      // Support X-Session-Token custom header
      if (!token) {
        const xt = headers?.get ? headers.get('x-session-token') : undefined;
        if (xt) token = xt;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!token) {
    try {
      const headers = (request as any).headers;
      const raw = headers?.get ? headers.get('cookie') : undefined;
      if (raw) {
        try {
          const names = raw
            .split(';')
            .map((p: string) => p.split('=')[0].trim())
            .filter(Boolean);
          console.debug(`[session] no ${COOKIE_NAMES.SESSION_TOKEN} cookie found; Cookie header contains:`, names.join(','));
        } catch (e) {
          console.debug(`[session] no ${COOKIE_NAMES.SESSION_TOKEN} cookie found but Cookie header present (could not parse names)`);
        }
      } else {
        console.debug('[session] no session-token and no Cookie header present on request');
      }
    } catch (e) {
      // ignore logging errors
    }
    return null;
  }
  const payload = await verifySession(token);
  try {
    // Minimal debug info to help investigate intermittent 401s in dev.
    // Do not log full token in production.
    const short = token ? (token.length > 8 ? token.slice(0, 8) + '...' : token) : 'none';
    if (!payload) {
      console.debug(`[session] token present=${!!token} tokenPreview=${short} — verifySession returned null`);
    } else {
      console.debug(`[session] verified userId=${payload.userId} tokenPreview=${short} permissionVersion=${payload.permissionVersion || 'n/a'}`);
    }
  } catch (e) {
    console.debug('[session] debug logging failed', e);
  }

  return payload;
}
