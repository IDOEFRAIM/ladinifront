import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { LoginSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { COOKIE_NAMES } from '@/lib/cookie-helpers';
import { loadUserContext, setSessionCookies } from '@/features/auth/services/session-cookies';

export async function loginUser(credentials: { phone: string; password: string }) {
    try {
        const validation = LoginSchema.safeParse(credentials);
        if (!validation.success) {
            return { success: false, error: "Identifiants invalides." };
        }

        const { phone, password } = validation.data;

        const user = await db.query.users.findFirst({
            where: eq(schema.users.phone, phone),
            columns: {
                id: true, name: true, phone: true, password: true, role: true,
                updatedAt: true, onboardingCompleted: true,
            },
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
            { id: user.id, role: user.role, name: user.name, updatedAt: user.updatedAt, onboardingCompleted: user.onboardingCompleted },
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
                    onboardingCompleted: user.onboardingCompleted,
                }
        };

    } catch (error) {
        console.error('[auth] login error:', (error as Error)?.message || error);
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
        cookieStore.delete(COOKIE_NAMES.ONBOARDING_COMPLETED);
        // Legacy cleanup: removed legacy `user-id` cookie handling
        return { success: true };
    } catch (error) {
        return { success: false, error: "Erreur lors de la déconnexion" };
    }
}
