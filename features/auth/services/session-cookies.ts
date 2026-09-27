import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from "next/headers";
import { signSession } from '@/lib/session';
import { COOKIE_NAMES, publicOpts, httpOnlyOpts } from '@/lib/cookie-helpers';

// ─── Helper : Charge les memberships org et compile les permissions ───
export async function loadUserContext(userId: string) {
    const memberships = await db.query.userOrganizations.findMany({
        where: eq(schema.userOrganizations.userId, userId),
        with: {
            dynRole: { columns: { permissions: true } },
        },
    });

    // On garde les permissions attachées à chaque organisation
    const orgs = memberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role,
        managedZoneId: m.managedZoneId,
        permissions: m.dynRole?.permissions || [] // On ne "flat" pas ici
    }));

    // On ne renvoie pas un tableau de permissions global
    // Optionally expose an aggregated permissions list for convenience
    const allPermissions = Array.from(new Set(orgs.flatMap(o => o.permissions || [])));
    return { orgs, permissions: allPermissions };
}

// ─── Helper : Écriture des cookies sécurisés ───

export async function setSessionCookies(
    user: { id: string; role: string; name: string | null; updatedAt?: Date; onboardingCompleted?: boolean }, 
    location: { id: string; name: string } | null, 
    permissions: string[], 
    orgs: { organizationId: string; role: string }[]
) {
    const cookieStore = await cookies();
    const roleValue = (user.role || '').toString().toUpperCase();
    const pv = (user.updatedAt ?? new Date()).getTime().toString();
    const primaryOrg = (orgs && orgs.length > 0) ? orgs[0] : null;

    // 1. STOCKAGE JWT (Source de vérité Serveur - httpOnly)
    // On centralise tout dans le token pour éviter la désynchronisation
    try {
        const token = await signSession({ 
            userId: user.id, 
            role: roleValue, 
            permissionVersion: pv, 
            activeOrgId: primaryOrg?.organizationId,
            onboardingCompleted: !!user.onboardingCompleted,
        });
        cookieStore.set(COOKIE_NAMES.SESSION_TOKEN, token, httpOnlyOpts());
    } catch (err) {
        console.error('CRITICAL: Could not sign session token', err);
        return; // On arrête tout si le token échoue
    }

    // 2. STOCKAGE CLIENT (Données d'affichage - Non-httpOnly)
    // On limite au strict minimum pour éviter le "Cookie Bloat"
    const publicData = {
        [COOKIE_NAMES.USER_ROLE]: roleValue,
        [COOKIE_NAMES.USER_NAME]: user.name || '',
        [COOKIE_NAMES.PERMISSION_VERSION]: pv,
        [COOKIE_NAMES.ACTIVE_ORG_ID]: primaryOrg?.organizationId || '',
        [COOKIE_NAMES.SESSION_READY]: '1',
        [COOKIE_NAMES.ONBOARDING_COMPLETED]: user.onboardingCompleted ? '1' : '0',
    };

    // On itère pour définir les cookies publics
    Object.entries(publicData).forEach(([name, value]) => {
        try {
            cookieStore.set(name, value, publicOpts());
        } catch (e) {
            console.warn(`Could not set cookie ${name}`, e);
        }
    });

    // 3. CAS PARTICULIERS (JSON complexes)
    // Attention : JSON.stringify peut vite dépasser 4Ko si permissions est large
    if (location) {
        cookieStore.set(COOKIE_NAMES.USER_ZONE, JSON.stringify(location), publicOpts());
    }

    // OPTIMISATION : Ne stocker les permissions que si elles sont peu nombreuses
    // Sinon, le client doit les récupérer via un appel API /api/me
    if (permissions.length < 20) {
        cookieStore.set(COOKIE_NAMES.USER_PERMISSIONS, JSON.stringify(permissions), publicOpts());
    } else {
        console.warn(`Too many permissions (${permissions.length}) for cookies. Use API fetch.`);
        cookieStore.set(COOKIE_NAMES.USER_PERMISSIONS, '[]', publicOpts());
    }

    if (process.env.NODE_ENV !== 'production') {
        console.log(`Session set: User=${user.id}, Org=${primaryOrg?.organizationId}, PV=${pv}`);
    }
}
// ╔══════════════════════════════════════════════╗
// ║  INSCRIPTION                                 ║
// ╚══════════════════════════════════════════════╝
