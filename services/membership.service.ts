import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { audit } from "@/lib/audit";

/**
 * SERVICE DE GESTION DES MEMBRES (Multi-Tenant)
 * ────────────────────────────────────────────────────────
 * Garantit l'isolation des données : un administrateur ne
 * peut agir que sur sa propre organisation. Utilise des
 * transactions pour maintenir la cohérence de la base.
 */

// ─── 1. Demande d'adhésion (Producer Onboarding) ────────
export async function requestOrganizationMembership(userId: string, organizationId: string) {
  return await db.transaction(async (tx) => {
    const user = await tx.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (!user) throw new Error("Utilisateur introuvable.");
    if (user.role !== "PRODUCER") throw new Error("Seul un profil PRODUCER peut faire cette demande via ce flux.");

    const org = await tx.query.organizations.findFirst({ where: eq(schema.organizations.id, organizationId) });
    if (!org) throw new Error("Organisation introuvable.");

    // Créer ou mettre à jour le profil producteur avec le statut PENDING
    const [producer] = await tx.insert(schema.producers)
      .values({
        userId,
        organizationId,
        businessName: user.name || "Nouveau Producteur",
        status: 'PENDING',
      })
      .onConflictDoUpdate({
        target: schema.producers.userId,
        set: {
          organizationId,
          status: 'PENDING',
        },
      })
      .returning();

    // Ajouter l'utilisateur à l'organisation avec un rôle par défaut basique
    // Il n'aura pas de permissions avancées tant que l'admin ne l'a pas validé.
    await tx.insert(schema.userOrganizations)
      .values({
        userId,
        organizationId,
        role: 'FIELD_AGENT',
      })
      .onConflictDoUpdate({
        target: [schema.userOrganizations.userId, schema.userOrganizations.organizationId],
        set: {
          role: 'FIELD_AGENT',
        },
      });

    await audit({
      actorId: userId,
      action: "ORG_MEMBERSHIP_REQUESTED",
      entityId: organizationId,
      entityType: "ORGANIZATION",
      newValue: { producerId: producer.id, status: 'PENDING' },
    });

    return producer;
  });
}

// ─── 2. Validation par l'Administrateur ─────────────────
export async function validateProducerMembership(adminUserId: string, organizationId: string, producerUserId: string) {
  return await db.transaction(async (tx) => {
    // A. Vérification de l'isolation & des droits (Règle d'or)
    const adminMembership = await tx.query.userOrganizations.findFirst({
      where: and(
        eq(schema.userOrganizations.userId, adminUserId),
        eq(schema.userOrganizations.organizationId, organizationId)
      ),
    });

    if (!adminMembership || (adminMembership.role !== 'ADMIN' && adminMembership.role !== 'ZONE_MANAGER')) {
      throw new Error("Accès refusé. Droits d'administration requis pour cette organisation.");
    }

    // B. Vérification du producteur cible
    const producer = await tx.query.producers.findFirst({ where: eq(schema.producers.userId, producerUserId) });
    if (!producer || producer.organizationId !== organizationId) {
      throw new Error("Producteur introuvable dans cette organisation.");
    }

    // C. Validation (Passage à ACTIVE)
    const [updatedProducer] = await tx.update(schema.producers)
      .set({ status: 'ACTIVE' })
      .where(eq(schema.producers.id, producer.id))
      .returning();

    await audit({
      actorId: adminUserId,
      action: "PRODUCER_MEMBERSHIP_VALIDATED",
      entityId: producer.id,
      entityType: "PRODUCER",
      oldValue: { status: producer.status },
      newValue: { status: 'ACTIVE' },
    });

    return updatedProducer;
  });
}

// ─── 3. Assignation d'un Agent à une Zone de Travail ────
export async function assignAgentToWorkZone(adminUserId: string, organizationId: string, agentUserId: string, zoneId: string, specificRole?: string) {
  return await db.transaction(async (tx) => {
    // Vérification droits administrateur (Isolation M-T)
    const adminMembership = await tx.query.userOrganizations.findFirst({
      where: and(
        eq(schema.userOrganizations.userId, adminUserId),
        eq(schema.userOrganizations.organizationId, organizationId)
      ),
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN') {
      throw new Error("Accès refusé. Seul un Admin peut assigner des zones de travail.");
    }

    // Vérification que l'agent fait bien partie de l'organisation
    const agentMembership = await tx.query.userOrganizations.findFirst({
      where: and(
        eq(schema.userOrganizations.userId, agentUserId),
        eq(schema.userOrganizations.organizationId, organizationId)
      ),
    });

    if (!agentMembership) {
      throw new Error("Cet agent ne fait pas partie de votre organisation.");
    }

    // Création ou Mise à jour de la WorkZone
    const [workZone] = await tx.insert(schema.workZones)
      .values({
        organizationId,
        zoneId,
        managerId: agentUserId,
        role: specificRole || "ZONE_AGENT"
      })
      .onConflictDoUpdate({
        target: [schema.workZones.organizationId, schema.workZones.zoneId],
        set: {
          managerId: agentUserId,
          role: specificRole || "ZONE_AGENT"
        }
      })
      .returning();

    // Mettre à jour le managedZoneId de l'agent dans sa relation à l'org
    await tx.update(schema.userOrganizations)
      .set({ managedZoneId: zoneId })
      .where(eq(schema.userOrganizations.id, agentMembership.id));

    await audit({
      actorId: adminUserId,
      action: "AGENT_ASSIGNED_TO_ZONE",
      entityId: workZone.id,
      entityType: "WORKZONE",
      newValue: { agentId: agentUserId, zoneId, orgId: organizationId },
    });

    return workZone;
  });
}
