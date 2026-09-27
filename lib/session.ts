import { SignJWT, jwtVerify } from 'jose';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';

const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-session-secret';
const encoder = new TextEncoder();
const secretKey = encoder.encode(SECRET);

// Journalisation de diagnostic (2026-08-27) : auparavant systématique dès que
// `NODE_ENV !== 'production'`, donc sur CHAQUE requête authentifiée en dev —
// une ligne `[session] verified ...` par appel de `getAccessContext`
// (middleware + chaque route API), noyant les vrais signaux (ex: la boucle
// POST /api/delivery/status) dans du bruit. Devient opt-in via
// `DEBUG_SESSION=true` ; silencieux par défaut, y compris en dev.
const SESSION_DEBUG = process.env.DEBUG_SESSION === 'true';

export type SessionPayload = {
  userId: string;
  role?: string;
  permissionVersion?: string;
  activeOrgId?: string;
  onboardingCompleted?: boolean;
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
    // Diagnostic optionnel (DEBUG_SESSION=true) pour les jetons expirés,
    // signatures invalides, jetons malformés... Ne logue jamais le contenu.
    if (SESSION_DEBUG) {
      try {
        // err may be a JOSE error with message
        // eslint-disable-next-line no-console
        console.debug('[session] verifySession error:', (err as any)?.message ?? err);
      } catch (e) {
        // swallow logging issues
      }
    }
    return null;
  }
}

type SessionRequest = Request | { cookies?: { get(name: string): { value: string } | undefined } } | { headers?: { get(name: string): string | null } };

export async function getSessionFromRequest(request: SessionRequest) {
  const isDev = SESSION_DEBUG;
  let token: string | undefined;
  try {
    if ('cookies' in request && request.cookies && typeof request.cookies.get === 'function') {
      token = request.cookies.get(COOKIE_NAMES.SESSION_TOKEN)?.value;
    }
  } catch (e) {
    // ignore
  }

  if (!token) {
    try {
      const headers = 'headers' in request ? request.headers : undefined;
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
          if (isDev) console.debug(`[session] no ${COOKIE_NAMES.SESSION_TOKEN} cookie found; Cookie header contains:`, names.join(','));
        } catch (e) {
          if (isDev) console.debug(`[session] no ${COOKIE_NAMES.SESSION_TOKEN} cookie found but Cookie header present (could not parse names)`);
        }
      } else {
       if (isDev) console.debug('[session] no session-token and no Cookie header present on request');
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
    if (isDev) {
      const short = token ? (token.length > 8 ? token.slice(0, 8) + '...' : token) : 'none';
      if (!payload) {
        console.debug(`[session] token present=${!!token} tokenPreview=${short} — verifySession returned null`);
      } else {
        console.debug(`[session] verified userId=${payload.userId} tokenPreview=${short} permissionVersion=${payload.permissionVersion || 'n/a'}`);
      }
    }
  } catch (e) {
    if (isDev) console.debug('[session] debug logging failed', e);
  }

  return payload;
}
