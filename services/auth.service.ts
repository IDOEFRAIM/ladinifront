'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { RegisterSchema, LoginSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { requestOrganizationMembership } from "./membership.service";

// ─── Helper : Charge les memberships org et compile les permissions ───
async function loadUserContext(userId: string) {
    const memberships = await db.query.userOrganizations.findMany({
        where: eq(schema.userOrganizations.userId, userId),
        columns: {
            organizationId: true,
            role: true,
            managedZoneId: true,
        },
        with: {
            dynRole: { columns: { permissions: true } },
        },
    });

    const orgs = memberships.map((m: any) => ({
        organizationId: m.organizationId,
        role: m.role,
        managedZoneId: m.managedZoneId,
    }));
    const permissionsSet = new Set<string>();
    memberships.forEach((m: any) => {
        (m.dynRole?.permissions || []).forEach((p: string) => permissionsSet.add(p));
    });
    return { orgs, permissions: Array.from(permissionsSet) };
}

// ─── Helper : Écriture des cookies sécurisés ───
import { signSession } from '@/lib/session';
import { COOKIE_NAMES, publicOpts, httpOnlyOpts, DEFAULT_COOKIE_OPTS } from '@/lib/cookie-helpers';

async function setSessionCookies(user: {
    id: string; role: string; name: string | null; updatedAt?: Date;
}, location: { id: string; name: string } | null, permissions: string[], orgs: { organizationId: string; role: string }[]) {
    const cookieStore = await cookies();
    const cookieOpts = DEFAULT_COOKIE_OPTS;
    // Do NOT write raw `user-id` cookie anymore. Use signed `session-token` instead.
    cookieStore.set(COOKIE_NAMES.USER_ROLE, user.role, publicOpts());
    cookieStore.set(COOKIE_NAMES.USER_NAME, user.name || '', publicOpts());
    if (location) {
        cookieStore.set(COOKIE_NAMES.USER_ZONE, JSON.stringify(location), publicOpts());
    }
    // Ensure permissions and role cache are always present for client-side hooks
    cookieStore.set(COOKIE_NAMES.USER_PERMISSIONS, JSON.stringify(permissions || []), publicOpts());

    // Always set a `user-org` cookie so client-side code has a predictable shape.
    // If user has no orgs, store `null` (string) — clients should handle nulls gracefully.
    const primaryOrg = (orgs && orgs.length > 0) ? orgs[0] : null;
    try {
        cookieStore.set(COOKIE_NAMES.USER_ORG, JSON.stringify(primaryOrg), publicOpts());
    } catch (e) {
        console.warn('Could not set user-org cookie', e);
    }

    // Only set `active-org-id` when there's an actual organization to activate
    if (primaryOrg) {
        try {
            cookieStore.set(COOKIE_NAMES.ACTIVE_ORG_ID, primaryOrg.organizationId, publicOpts());
            console.log(`setSessionCookies: active-org-id cookie written=${primaryOrg.organizationId}`);
        } catch (e) {
            console.warn('Could not set active-org-id cookie', e);
        }
    } else {
        // Helpful debug for missing orgs
        console.warn(`setSessionCookies: no orgs found for user ${user.id}; active-org-id won't be set`);
    }
    // permissionVersion : timestamp du user.updatedAt utilisé pour détecter
    // les sessions dont les permissions ont changé (changement de rôle, etc.)
    const pv = (user.updatedAt ?? new Date()).getTime().toString();
    cookieStore.set(COOKIE_NAMES.PERMISSION_VERSION, pv, publicOpts());
    // Create a signed session token (JWT) containing minimal identity info and set it httpOnly
    try {
        const activeOrgIdForToken = orgs.length > 0 ? orgs[0].organizationId : undefined;
        const token = await signSession({ userId: user.id, role: user.role, permissionVersion: pv, activeOrgId: activeOrgIdForToken });
        cookieStore.set(COOKIE_NAMES.SESSION_TOKEN, token, httpOnlyOpts());
                // Non-httpOnly readiness cookie to let client detect when the server-set httpOnly
                // `session-token` is present. Clients should remove this when they read it.
                try {
                    cookieStore.set(COOKIE_NAMES.SESSION_READY, '1', publicOpts());
                } catch (e) {
                    // non-fatal — cookie API may throw in some environments
                    console.warn('Could not set session-ready cookie', e);
                }

                // Ensure `user-role` is written after token signing as a reliable client-visible
                // indicator. Some environments / ordering cause the initial write to be missed
                // by the browser; rewriting here increases robustness.
                try {
                    const roleValue = (user.role || '').toString().toUpperCase();
                    cookieStore.set(COOKIE_NAMES.USER_ROLE, roleValue, publicOpts());
                } catch (e) {
                    console.warn('Could not set user-role cookie after signing session', e);
                }

                console.log(`setSessionCookies: session-token signed (len=${token?.length}), activeOrgId=${activeOrgIdForToken}`);
    } catch (err) {
        console.warn('Could not sign session token', err);
    }
}

// ╔══════════════════════════════════════════════╗
// ║  INSCRIPTION                                 ║
// ╚══════════════════════════════════════════════╝

export async function registerUser(data: {
    email: string;
    password: string;
    name: string;
    role?: string;
    phone?: string;
    adminSecret?: string;
    locationId?: string;
    isProducer?: boolean;
    // org request
    organizationId?: string;
    wantsOrganization?: boolean;
    orgName?: string;
    orgType?: string;
    orgTaxId?: string | null;
    orgDescription?: string | null;
}) {
    try {
        // Normalize incoming role to the allowed system roles to avoid zod enum mismatches
        const allowedRoles = ['SUPERADMIN', 'ADMIN', 'USER', 'PRODUCER', 'BUYER', 'AGENT'];
        const normalizedRole = (data.role && allowedRoles.includes(data.role)) ? data.role : 'USER';
        // Use extended schema when organization request fields are present
        const useWithOrg = !!(data.wantsOrganization);
        const validation = useWithOrg
            ? (await import('@/lib/validators')).RegisterWithOrgSchema.safeParse({ ...data, role: normalizedRole })
            : RegisterSchema.safeParse({ ...data, role: normalizedRole });
        if (!validation.success) {
            const errors = validation.error.issues.map((e: any) => e.message).join(', ');
            return { success: false, error: errors };
        }

        const { email, password, name, role, phone } = validation.data as any;
        const locationId = data.locationId;

        // Admin secret check
        if (role === 'ADMIN') {
            const masterSecret = process.env.ADMIN_REGISTRATION_SECRET;
            if (!masterSecret || data.adminSecret !== masterSecret) {
                return { success: false, error: "Code d'autorisation Admin incorrect." };
            }
        }

        // Check uniqueness
        const existingUser = await db.query.users.findFirst({
            where: phone
                ? or(eq(schema.users.email, email), eq(schema.users.phone, phone))
                : eq(schema.users.email, email),
        });
        if (existingUser) {
            return { success: false, error: "Cet email ou numéro de téléphone est déjà utilisé." };
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Resolve pending status for producers (schema uses enum `ProducerStatus`)
        let pendingStatus: string | undefined;
        if (data.isProducer) {
            pendingStatus = 'PENDING';
        }

        const [newUser] = await db.insert(schema.users).values({
            email,
            password: hashedPassword,
            name,
            role: role as any,
            phone: phone || undefined,
        }).returning();

        // Create producer profile if needed
        if (data.isProducer) {
            await db.insert(schema.producers).values({
                userId: newUser.id,
                businessName: name || "Nouveau Producteur",
                status: 'PENDING' as any,
                zoneId: locationId || undefined,
            });
        }

        // Handle organization joining/creation for PRODUCER
        let createdOrg: any = null;
        let membershipRequested = false;

        if (String(role).toUpperCase() === 'PRODUCER') {
            if (data.organizationId) {
                // Multi-Tenant: Request membership to an existing organization
                try {
                    await requestOrganizationMembership(newUser.id, data.organizationId);
                    membershipRequested = true;
                    
                    const cookieStore = await cookies();
                    cookieStore.set(COOKIE_NAMES.ACTIVE_ORG_ID, data.organizationId, publicOpts());
                } catch (err) {
                    console.error('Error requesting org membership during registration:', err);
                }
            } else if (data.wantsOrganization && data.orgName) {
                // Creation of a new organization (User becomes ADMIN)
                try {
                    createdOrg = await db.transaction(async (tx) => {
                        const [org] = await tx.insert(schema.organizations).values({
                            name: data.orgName!,
                            type: data.orgType as any,
                            taxId: data.orgTaxId ?? null,
                            description: data.orgDescription ?? null,
                        }).returning();

                        await tx.insert(schema.userOrganizations).values({
                            userId: newUser.id,
                            organizationId: org.id,
                            role: 'ADMIN' as any,
                        });

                        if (data.isProducer) {
                            await tx.update(schema.producers)
                                .set({ organizationId: org.id })
                                .where(eq(schema.producers.userId, newUser.id));
                        }

                        return org;
                    });

                    await audit({ actorId: newUser.id, action: 'ORG_CREATION_REQUESTED', entityId: createdOrg.id, entityType: 'Organization', newValue: createdOrg });

                    const cookieStore = await cookies();
                    cookieStore.set(COOKIE_NAMES.ACTIVE_ORG_ID, createdOrg.id, publicOpts());
                } catch (err) {
                    console.error('Error creating org during registration', err);
                }
            }
        }

        // Get user zone (was `location` previously)
        let userLocation: { id: string; name: string } | null = null;
        if (locationId) {
            userLocation = await db.query.zones.findFirst({
                where: eq(schema.zones.id, locationId),
                columns: { id: true, name: true }
            }) ?? null;
        }

        const ctx = await loadUserContext(newUser.id);
        await setSessionCookies(
            { id: newUser.id, role: newUser.role, name: newUser.name, updatedAt: newUser.updatedAt },
            userLocation,
            ctx.permissions,
            ctx.orgs
        );

        await audit({
            actorId: newUser.id,
            action: 'USER_REGISTER',
            entityId: newUser.id,
            entityType: 'USER',
            newValue: { role, email, location: userLocation },
        });

        return {
            success: true,
            pendingOrgCreated: !!createdOrg,
            user: {
                id: newUser.id, role: newUser.role, name: newUser.name,
                location: userLocation, permissions: ctx.permissions, orgs: ctx.orgs
            }
        };

    } catch (error: any) {
        console.error("❌ Erreur Inscription:", error);
        if (error.code === '23505') {
            return { success: false, error: "L'email ou le numéro de téléphone est déjà utilisé." };
        }
        return { success: false, error: "Erreur lors de la création du compte." };
    }
}

// ╔══════════════════════════════════════════════╗
// ║  CONNEXION                                   ║
// ╚══════════════════════════════════════════════╝

export async function loginUser(credentials: { email: string; password: string }) {
    try {
        const validation = LoginSchema.safeParse(credentials);
        if (!validation.success) {
            return { success: false, error: "Identifiants invalides." };
        }

        const { email, password } = validation.data;

        const user = await db.query.users.findFirst({
            where: eq(schema.users.email, email),
            with: {
                producer: { columns: { id: true, status: true } },
            }
        });

        if (!user || !user.password) {
            return { success: false, error: "Identifiants invalides" };
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return { success: false, error: "Identifiants invalides" };
        }

        // Get first managed zone from org membership
        const firstMembership = await db.query.userOrganizations.findFirst({
            where: eq(schema.userOrganizations.userId, user.id),
            columns: { managedZoneId: true },
        });
        let userLocation: { id: string; name: string } | null = null;
        if (firstMembership?.managedZoneId) {
            userLocation = await db.query.zones.findFirst({
                where: eq(schema.zones.id, firstMembership.managedZoneId),
                columns: { id: true, name: true }
            }) ?? null;
        }

        const ctx = await loadUserContext(user.id);
        await setSessionCookies(
            { id: user.id, role: user.role, name: user.name, updatedAt: user.updatedAt },
            userLocation,
            ctx.permissions,
            ctx.orgs
        );

        await audit({
            actorId: user.id,
            action: 'USER_LOGIN',
            entityId: user.id,
            entityType: 'USER',
            newValue: { role: user.role },
        });

        return {
            success: true,
                user: {
                    id: user.id,
                    role: user.role,
                    name: user.name,
                    // producer status is now the enum `status`
                    producerStatus: user.producer?.status || null,
                    location: userLocation || null,
                    permissions: ctx.permissions,
                    orgs: ctx.orgs,
                }
        };

    } catch (error) {
        console.error("❌ Erreur Login:", error);
        return { success: false, error: "Une erreur est survenue lors de la connexion" };
    }
}

// ╔══════════════════════════════════════════════╗
// ║  DÉCONNEXION                                 ║
// ╚══════════════════════════════════════════════╝

export async function logoutUser() {
    try {
        const cookieStore = await cookies();
        // JWT session (primary auth)
        cookieStore.delete(COOKIE_NAMES.SESSION_TOKEN);
        // Org context
        cookieStore.delete(COOKIE_NAMES.ACTIVE_ORG_ID);
        // Session readiness flag used by client to detect httpOnly cookie presence
        cookieStore.delete(COOKIE_NAMES.SESSION_READY);
        // Client-side cache cookies
        cookieStore.delete(COOKIE_NAMES.USER_ROLE);
        cookieStore.delete(COOKIE_NAMES.USER_NAME);
        cookieStore.delete(COOKIE_NAMES.USER_ZONE);
        cookieStore.delete(COOKIE_NAMES.USER_PERMISSIONS);
        cookieStore.delete(COOKIE_NAMES.USER_ORG);
        // Legacy cleanup: removed legacy `user-id` cookie handling
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erreur lors de la déconnexion" };
    }
}