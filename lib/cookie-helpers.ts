export const COOKIE_NAMES = {
  SESSION_TOKEN: 'session-token',
  USER_ROLE: 'user-role',
  USER_NAME: 'user-name',
  USER_ZONE: 'user-zone',
  USER_PERMISSIONS: 'user-permissions',
  USER_ORG: 'user-org',
  ACTIVE_ORG_ID: 'active-org-id',
  PERMISSION_VERSION: 'permission-version',
  SESSION_READY: 'session-ready',
};

export const DEFAULT_COOKIE_OPTS = {
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
};

export type CookieOptions = typeof DEFAULT_COOKIE_OPTS & { httpOnly?: boolean };

export function httpOnlyOpts(): CookieOptions {
  return { ...DEFAULT_COOKIE_OPTS, httpOnly: true };
}

export function publicOpts(): CookieOptions {
  return { ...DEFAULT_COOKIE_OPTS, httpOnly: false };
}
