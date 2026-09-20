import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { RegisterSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { requestOrganizationMembership } from "@/features/organization/services/membership.service";
import { COOKIE_NAMES, publicOpts } from '@/lib/cookie-helpers';
import { loadUserContext, setSessionCookies } from '@/features/auth/services/session-cookies';
import { asError } from '@/lib/errors';

export async function registerUser(data: {
    email?: string;
    password: string;
    name: string;
    role?: string;
    phone: string;
    whatsappEnabled?: boolean;
    dailyAdviceTime?: string;
    latitude?: number;
    longitude?: number;
    cnibNumber?: string | null;
    zoneId?: string;
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
    // buyer B2B onboarding
    buyerTypeId?: string;
    establishmentName?: string;
    defaultDeliveryAddress?: string;
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

        const { email, password, name, role, phone, whatsappEnabled, dailyAdviceTime, latitude, longitude, cnibNumber, zoneId } = validation.data as any;
        const locationId = data.locationId || zoneId;

        // Admin / Superadmin secret check
        if (role === 'ADMIN' || role === 'SUPERADMIN') {
            const masterSecret = process.env.ADMIN_REGISTRATION_SECRET;
            if (!masterSecret || data.adminSecret !== masterSecret) {
                return { success: false, error: "Code d'autorisation Admin incorrect. Veuillez contacter un administrateur." };
            }
        }

        // Check uniqueness — le téléphone est désormais obligatoire (identifiant de connexion),
        // l'email reste optionnel et n'est vérifié que s'il a été renseigné.
        const existingUser = await db.query.users.findFirst({
            where: email
                ? or(eq(schema.users.phone, phone), eq(schema.users.email, email))
                : eq(schema.users.phone, phone),
        });
        if (existingUser) {
            return { success: false, error: "Ce numéro de téléphone ou cet email est déjà utilisé. Vous pouvez vous connecter." };
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Resolve pending status for producers (schema uses enum `ProducerStatus`)
        let pendingStatus: string | undefined;
        if (data.isProducer) {
            pendingStatus = 'PENDING';
        }

        const [newUser] = await db.insert(schema.users).values({
            email: email || null,
            password: hashedPassword,
            name,
            role: role as any,
            phone,
            whatsappEnabled: whatsappEnabled ?? true,
            // (2026-09-02) `dailyAdviceTime` n'existe plus sur `users` (colonne
            // supprimée, aucun remplacement dans le schéma actuel) — retiré.
            latitude: latitude ?? undefined,
            longitude: longitude ?? undefined,
            cnibNumber: cnibNumber && cnibNumber.trim() !== "" ? cnibNumber : null,
            zoneId: zoneId ?? undefined,
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

        // Create buyer profile for BUYER role (B2B onboarding)
        if (String(role).toUpperCase() === 'BUYER') {
            await db.insert(schema.buyerProfiles).values({
                userId: newUser.id,
                buyerTypeId: data.buyerTypeId || null,
                establishmentName: data.establishmentName || null,
                defaultDeliveryAddress: data.defaultDeliveryAddress || null,
                isVerified: false,
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
            { id: newUser.id, role: newUser.role, name: newUser.name, updatedAt: newUser.updatedAt, onboardingCompleted: false },
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
                location: userLocation, permissions: ctx.permissions, orgs: ctx.orgs,
                onboardingCompleted: false
            }
        };

    } catch (_error: unknown) {
    const error = asError(_error);
        console.error('[auth] register error:', error?.message || error);
        if (error.code === '23505') {
            return { success: false, error: "Le numéro de téléphone ou l'email est déjà utilisé." };
        }
        return { success: false, error: "Erreur lors de la création du compte." };
    }
}

// ╔══════════════════════════════════════════════╗
// ║  CONNEXION                                   ║
// ╚══════════════════════════════════════════════╝
