import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Calcule la distance en km entre deux points GPS (formule de Haversine).
 */
export async function calculateDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): Promise<number> {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// ── Auto-create agent profile ────────────────────────────────────────────

/**
 * Résout ou crée un profil delivery_agent pour un userId.
 * Appelé automatiquement lors des actions agent pour garantir
 * qu'un AGENT a toujours un enregistrement delivery_agents.
 */
export async function resolveOrCreateDeliveryAgent(userId: string) {
  if (!userId) return null;

  const existing = await db.query.deliveryAgents.findFirst({
    where: eq(schema.deliveryAgents.userId, userId),
  });
  if (existing) return existing;

  // Auto-create with status AVAILABLE (ready to receive deliveries)
  const [created] = await db.insert(schema.deliveryAgents).values({
    userId,
    status: 'AVAILABLE',
  }).returning();

  return created ?? null;
}

// ── Flux Logistique ──────────────────────────────────────────────────────

/**
 * Mise à jour du statut en ligne/hors ligne du transporteur.
 */
export async function updateAgentStatus(userId: string, status: 'AVAILABLE' | 'OFFLINE') {
  // Auto-create profile if needed (first time agent goes online)
  const agent = await resolveOrCreateDeliveryAgent(userId);
  if (!agent) return { success: false, error: 'Impossible de créer le profil transporteur' };

  const [updated] = await db.update(schema.deliveryAgents)
    .set({ status })
    .where(eq(schema.deliveryAgents.userId, userId))
    .returning();

  if (!updated) return { success: false, error: 'Profil transporteur introuvable' };
  return { success: true, data: updated };
}

/**
 * Historique des livraisons d'un transporteur.
 */
export async function getAgentDeliveryHistory(userId: string, limit = 50) {
  const agent = await db.query.deliveryAgents.findFirst({
    where: eq(schema.deliveryAgents.userId, userId),
    columns: { id: true },
  });
  if (!agent) return [];

  return db.query.deliveries.findMany({
    where: eq(schema.deliveries.deliveryAgentId, agent.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit,
    with: {
      order: {
        columns: { id: true, customerName: true, city: true, totalAmount: true, createdAt: true },
      },
    },
  });
}
