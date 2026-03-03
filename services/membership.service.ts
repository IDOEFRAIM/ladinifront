import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { OrgRole, ProducerStatus } from "@prisma/client";

/**
 * SERVICE DE GESTION DES MEMBRES (Multi-Tenant)
 * ────────────────────────────────────────────────────────
 * Garantit l'isolation des données : un administrateur ne
 * peut agir que sur sa propre organisation. Utilise des
 * transactions pour maintenir la cohérence de la base.
 */

// ─── 1. Demande d'adhésion (Producer Onboarding) ────────
export async function requestOrganizationMembership(userId: string, organizationId: string) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Utilisateur introuvable.");
    if (user.role !== "PRODUCER") throw new Error("Seul un profil PRODUCER peut faire cette demande via ce flux.");

    const org = await tx.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new Error("Organisation introuvable.");

    // Créer ou mettre à jour le profil producteur avec le statut PENDING
    const producer = await tx.producer.upsert({
      where: { userId },
      create: {
        userId,
        organizationId,
        businessName: user.name || "Nouveau Producteur",
        status: ProducerStatus.PENDING,
      },
      update: {
        organizationId,
        status: ProducerStatus.PENDING,
      },
    });

    // Ajouter l'utilisateur à l'organisation avec un rôle par défaut basique
    // Il n'aura pas de permissions avancées tant que l'admin ne l'a pas validé.
    await tx.userOrganization.upsert({
      where: {
        userId_organizationId: { userId, organizationId },
      },
      create: {
        userId,
        organizationId,
        role: OrgRole.FIELD_AGENT,
      },
      update: {
        role: OrgRole.FIELD_AGENT,
      }
    });

    await audit({
      actorId: userId,
      action: "ORG_MEMBERSHIP_REQUESTED",
      entityId: organizationId,
      entityType: "ORGANIZATION",
      newValue: { producerId: producer.id, status: ProducerStatus.PENDING },
    });

    return producer;
  });
}

// ─── 2. Validation par l'Administrateur ─────────────────
export async function validateProducerMembership(adminUserId: string, organizationId: string, producerUserId: string) {
  return await prisma.$transaction(async (tx) => {
    // A. Vérification de l'isolation & des droits (Règle d'or)
    const adminMembership = await tx.userOrganization.findUnique({
      where: { userId_organizationId: { userId: adminUserId, organizationId } },
    });

    if (!adminMembership || (adminMembership.role !== OrgRole.ADMIN && adminMembership.role !== OrgRole.ZONE_MANAGER)) {
      throw new Error("Accès refusé. Droits d'administration requis pour cette organisation.");
    }

    // B. Vérification du producteur cible
    const producer = await tx.producer.findUnique({ where: { userId: producerUserId } });
    if (!producer || producer.organizationId !== organizationId) {
      throw new Error("Producteur introuvable dans cette organisation.");
    }

    // C. Validation (Passage à ACTIVE)
    const updatedProducer = await tx.producer.update({
      where: { id: producer.id },
      data: {
        status: ProducerStatus.ACTIVE,
      },
    });

    await audit({
      actorId: adminUserId,
      action: "PRODUCER_MEMBERSHIP_VALIDATED",
      entityId: producer.id,
      entityType: "PRODUCER",
      oldValue: { status: producer.status },
      newValue: { status: ProducerStatus.ACTIVE },
    });

    return updatedProducer;
  });
}

// ─── 3. Assignation d'un Agent à une Zone de Travail ────
export async function assignAgentToWorkZone(adminUserId: string, organizationId: string, agentUserId: string, zoneId: string, specificRole?: string) {
  return await prisma.$transaction(async (tx) => {
    // Vérification droits administrateur (Isolation M-T)
    const adminMembership = await tx.userOrganization.findUnique({
      where: { userId_organizationId: { userId: adminUserId, organizationId } },
    });

    if (!adminMembership || adminMembership.role !== OrgRole.ADMIN) {
      throw new Error("Accès refusé. Seul un Admin peut assigner des zones de travail.");
    }

    // Vérification que l'agent fait bien partie de l'organisation
    const agentMembership = await tx.userOrganization.findUnique({
      where: { userId_organizationId: { userId: agentUserId, organizationId } },
    });

    if (!agentMembership) {
      throw new Error("Cet agent ne fait pas partie de votre organisation.");
    }

    // Création ou Mise à jour de la WorkZone
    const workZone = await tx.workZone.upsert({
      where: {
        organizationId_zoneId: { organizationId, zoneId }
      },
      create: {
        organizationId,
        zoneId,
        managerId: agentUserId,
        role: specificRole || "ZONE_AGENT"
      },
      update: {
        managerId: agentUserId,
        role: specificRole || "ZONE_AGENT"
      }
    });

    // Mettre à jour le managedZoneId de l'agent dans sa relation à l'org
    await tx.userOrganization.update({
      where: { id: agentMembership.id },
      data: { managedZoneId: zoneId }
    });

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
