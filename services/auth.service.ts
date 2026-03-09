'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { RegisterSchema, LoginSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { requestOrganizationMembership } from "./membership.service";
import { signSession } from '@/lib/session';
import { COOKIE_NAMES, publicOpts, httpOnlyOpts, DEFAULT_COOKIE_OPTS } from '@/lib/cookie-helpers';

// ─── Helper : Charge les memberships org et compile les permissions ───
async function loadUserContext(userId: string) {
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

async function setSessionCookies(
    user: { id: string; role: string; name: string | null; updatedAt?: Date; }, 
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
            activeOrgId: primaryOrg?.organizationId 
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
        [COOKIE_NAMES.SESSION_READY]: '1'
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
                return { success: false, error: "Code d'autorisation Admin incorrect.Veuillez contacter un administrateur." };
            }
        }

        // Check uniqueness
        const existingUser = await db.query.users.findFirst({
            where: phone
                ? or(eq(schema.users.email, email), eq(schema.users.phone, phone))
                : eq(schema.users.email, email),
        });
        if (existingUser) {
            return { success: false, error: "Cet email ou numéro de téléphone est déjà utilisé.Vous pouvez vous connecter." };
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