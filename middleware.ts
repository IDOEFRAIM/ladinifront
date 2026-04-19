import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';

/**
 * MIDDLEWARE NEXT.JS — AgriConnect v2
 * ──────────────────────────────────────────────────────────────────────────
 * Protection des routes : RBAC hybride (rôle système + permission cache).
 *
 * Principes Zero-Trust appliqués ici :
 *  1. `session-token` (httpOnly, JWT signé) = seule preuve d'identité.
 *  2. `user-role` (non-httpOnly) sert aux redirections de haut niveau uniquement.
 *     Toujours re-valider en DB via getAccessContext() dans chaque API route.
 *  3. `user-permissions` = cache côté client (re-valider en DB pour les actions sensibles).
 *  4. `permission-version` = timestamp du dernier changement de rôle/permission.
 *     Permet de détecter les sessions périmées sans re-interroger la DB ici.
 */

// ─── Permission requise par préfixe de route ────────────────────────────────
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard':     ['STOCK_VIEW'],
  '/products':      ['PRODUCT_VIEW'],
  '/inventory':     ['STOCK_VIEW'],
  '/sales':         ['ORDER_VIEW'],
  '/clients':       ['USER_VIEW'],
  '/settings':      [],                   // authentifié suffit
  '/agents':        ['MONITORING_VIEW'],
  '/admin':         ['ORG_MANAGE'],
  '/org':           [],                   // authenticated + active org (checked in layout)
  '/market':        [],
  //'/orders':        ['ORDER_VIEW'],
  '/conversations': [],
};

// ─── Rôles autorisés par préfixe (contrôle haut niveau) ───────────────────
const ROUTE_ROLES: Record<string, string[]> = {
  '/dashboard':  ['PRODUCER', 'ADMIN', 'SUPERADMIN', 'AGENT'],
  '/products':   ['PRODUCER', 'ADMIN', 'SUPERADMIN'],
  '/inventory':  ['PRODUCER', 'ADMIN', 'SUPERADMIN', 'AGENT'],
  '/sales':      ['PRODUCER', 'ADMIN', 'SUPERADMIN'],
  '/clients':    ['PRODUCER', 'ADMIN', 'SUPERADMIN'],
  '/settings':   ['PRODUCER', 'ADMIN', 'SUPERADMIN', 'AGENT'],
  '/agents':     ['PRODUCER', 'ADMIN', 'SUPERADMIN'],
  '/admin':      ['ADMIN', 'SUPERADMIN'],
  '/org':        ['PRODUCER', 'ADMIN', 'SUPERADMIN', 'AGENT'],
  '/checkout':   ['BUYER', 'PRODUCER', 'ADMIN', 'SUPERADMIN'],
};

function parsePermissions(raw: string | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function middleware(request: NextRequest) {
  const userRole  = request.cookies.get(COOKIE_NAMES.USER_ROLE)?.value;
  const normalizedUserRole = userRole ? userRole.toUpperCase() : undefined;
  // Prefer signed session token if present
  const session = await getSessionFromRequest(request as any);
  // If a token is present but verification failed, clear stale cookies and force login
  const rawToken = request.cookies.get(COOKIE_NAMES.SESSION_TOKEN)?.value;
  if (rawToken && !session) {
    const loginUrl = new URL('/login', request.url);
    const res = NextResponse.redirect(loginUrl);
    try {
      // Clear primary httpOnly session cookie and client-side cache cookies
      res.cookies.set(COOKIE_NAMES.SESSION_TOKEN, '', { path: '/', maxAge: 0 });
      res.cookies.set(COOKIE_NAMES.SESSION_READY, '', { path: '/', maxAge: 0 });
      res.cookies.set(COOKIE_NAMES.USER_PERMISSIONS, '', { path: '/', maxAge: 0 });
      res.cookies.set(COOKIE_NAMES.USER_ROLE, '', { path: '/', maxAge: 0 });
      res.cookies.set(COOKIE_NAMES.ACTIVE_ORG_ID, '', { path: '/', maxAge: 0 });
    } catch (e) {
      // If runtime does not support res.cookies in this environment, ignore
    }
    return res;
  }
  const userIdFromToken = session?.userId;
  const roleFromToken = session?.role;
  const userId    = userIdFromToken;
  // Use role from session token as fallback if cookie is missing or stale
  const sessionRoleUpper = roleFromToken ? String(roleFromToken).toUpperCase() : undefined;
  const effectiveRole = normalizedUserRole || sessionRoleUpper;
  // L'utilisateur est authentifié si le JWT session-token contient un userId valide
  const isAuthenticated = !!userId;
  // Active organization (must be set for any org-scoped route)
  // Prefer cookie, fall back to signed session token `activeOrgId` when cookie missing.
  let activeOrgId = request.cookies.get(COOKIE_NAMES.ACTIVE_ORG_ID)?.value;
  if (!activeOrgId && session?.activeOrgId) {
    activeOrgId = session.activeOrgId;
  }
  // Extra fallback: some clients cache the first org in `user-org` (JSON). Try that.
  if (!activeOrgId) {
    const userOrgRaw = request.cookies.get(COOKIE_NAMES.USER_ORG)?.value;
    if (userOrgRaw) {
      try {
        const parsed = JSON.parse(userOrgRaw);
        if (parsed && parsed.organizationId) activeOrgId = String(parsed.organizationId);
      } catch (e) {
        // ignore malformed user-org cookie
      }
    }
  }
  const permsRaw  = request.cookies.get(COOKIE_NAMES.USER_PERMISSIONS)?.value;
  const perms     = parsePermissions(permsRaw);
  const { pathname } = request.nextUrl;
  const isAdmin   = effectiveRole === 'ADMIN' || effectiveRole === 'SUPERADMIN';

  // Routes considered organization-scoped (require active org)
  // Routes that truly require an active organization. Dashboard and orders
  // are accessible to producers without selecting an org, so they're excluded.
  const ORG_ROUTES = ['/org'];
  const isOrgRoute = ORG_ROUTES.some((p) => pathname.startsWith(p));

  // ╔══════════════════════════════════════════════╗
  // ║  ROUTES PROTÉGÉES — contrôle hybride         ║
  // ╚══════════════════════════════════════════════╝
  for (const [prefix, requiredPerms] of Object.entries(ROUTE_PERMISSIONS)) {
    if (!pathname.startsWith(prefix)) continue;

    // 1. L'utilisateur doit être authentifié (JWT session-token valide)
    if (!userId || !session) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // 1b. Si c'est une route scoped par organisation et qu'aucune org active
    // n'est définie, rediriger vers la sélection d'organisation.
    if (isOrgRoute && !activeOrgId && !isAdmin) {
      const selectUrl = new URL('/select-org', request.url);
      return NextResponse.redirect(selectUrl);
    }

    // 2. Vérifier le rôle de haut-niveau si défini
    const allowedRoles = ROUTE_ROLES[prefix];
    // Si la route a une restriction de rôle, appliquer la vérification en utilisant
    // le rôle effectif (cookie ou token). On évite ainsi les faux positifs lorsque
    // le cookie `user-role` est absent ou obsolète.
    if (allowedRoles && effectiveRole && !allowedRoles.includes(effectiveRole) && !isAdmin) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('forbidden', '1');
      return NextResponse.redirect(loginUrl);
    }

    // Si le rôle effectif est explicitement autorisé pour cette route, le rôle suffit
    // (bypass des permissions dynamiques côté middleware). Les API routes
    // devront quand même re-valider via getAccessContext() / AccessManager.
    if (allowedRoles && effectiveRole && allowedRoles.includes(effectiveRole)) {
      break;
    }

    // 3. ADMIN bypass permission check
    if (isAdmin) break;

    // 4. Vérifier les permissions dynamiques
    if (requiredPerms.length > 0 && !requiredPerms.some(p => perms.includes(p))) {
      // Si l'utilisateur est déjà authentifié, afficher une page 403 plutôt
      // que de le renvoyer au formulaire de login.
      if (isAuthenticated) {
        return NextResponse.rewrite(new URL('/403', request.url));
      }
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    break; // une seule règle appliquée
  }

  // ╔══════════════════════════════════════════════╗
  // ║  REDIRECTION SI DÉJÀ CONNECTÉ               ║
  // ╚══════════════════════════════════════════════╝
  const isAuthPage = pathname === '/signup' || pathname === '/login';

  const isForbidden = request.nextUrl.searchParams.get('forbidden') === '1';
  if (isAuthPage && isAuthenticated && !isForbidden) {
    const redirectMap: Record<string, string> = {
      'SUPERADMIN': '/admin',
      'ADMIN': '/admin',
      'PRODUCER': '/dashboard',
      'AGENT': '/dashboard',
      'USER': '/market',
      'BUYER': '/market',
    };
    // Prefer role from signed session token, then cookie-derived role.
    const sessionRole = roleFromToken ? String(roleFromToken).toUpperCase() : undefined;
    const roleKey = (sessionRole ?? normalizedUserRole ?? userRole ?? '').toUpperCase();
    const target = redirectMap[roleKey] || '/';
  
  if (pathname !== target) {
    return NextResponse.redirect(new URL(target, request.url));
  }
      // to be checked return NextResponse.redirect(new URL(target, request.url));
  }

  // ╔══════════════════════════════════════════════╗
  // ║  HEADERS DE SÉCURITÉ                         ║
  // ╚══════════════════════════════════════════════╝
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  // HSTS — production uniquement
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // CSP de base — report-only en dev pour ne pas casser les DevTools
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // requis par Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', cspDirectives);
  } else {
    response.headers.set('Content-Security-Policy-Report-Only', cspDirectives);
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/products/:path*',
    '/inventory/:path*',
    '/sales/:path*',
    '/clients/:path*',
    '/settings/:path*',
    '/agents/:path*',
    '/admin/:path*',
    '/market/:path*',
    '/checkout/:path*',
    //'/orders/:path*',
    '/conversations/:path*',
    '/org/:path*',
    '/signup',
    '/login',
    ],
};
