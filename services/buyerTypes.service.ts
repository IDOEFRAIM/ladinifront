'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import getUserIdFromSession from '@/lib/get-userId';
import { audit } from '@/lib/audit';

async function assertAdmin(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, role: true },
  });
  if (!user) throw new Error('Utilisateur introuvable');
  const role = String(user.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    throw new Error('Accès refusé');
  }
  return user;
}

export async function listBuyerTypes() {
  try {
    const rows = await db.query.buyerTypes.findMany({
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    return { success: true, data: rows };
  } catch (e: any) {
    console.error('listBuyerTypes error:', e);
    return { success: false, error: e?.message || 'Erreur interne' };
  }
}

export async function createBuyerType(input: { name: string; description?: string | null }) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    await assertAdmin(userId);

    const name = (input.name || '').trim();
    if (!name) return { success: false, error: 'Nom requis' };

    const existing = await db.query.buyerTypes.findFirst({ where: eq(schema.buyerTypes.name, name) });
    if (existing) return { success: false, error: 'Ce type existe déjà' };

    const [created] = await db
      .insert(schema.buyerTypes)
      .values({ name, description: input.description?.trim() || null })
      .returning();

    await audit({
      action: 'CREATE_BUYER_TYPE',
      actorId: userId,
      entityType: 'BuyerType',
      entityId: created.id,
      newValue: { name: created.name, description: created.description },
    });

    return { success: true, data: created };
  } catch (e: any) {
    console.error('createBuyerType error:', e);
    return { success: false, error: e?.message || 'Erreur interne' };
  }
}

export async function updateBuyerType(input: { id: string; name: string; description?: string | null }) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    await assertAdmin(userId);

    const name = (input.name || '').trim();
    if (!name) return { success: false, error: 'Nom requis' };

    const existing = await db.query.buyerTypes.findFirst({ where: eq(schema.buyerTypes.id, input.id) });
    if (!existing) return { success: false, error: 'Type introuvable' };

    // Prevent unique violation on rename
    const sameName = await db.query.buyerTypes.findFirst({ where: eq(schema.buyerTypes.name, name) });
    if (sameName && sameName.id !== input.id) return { success: false, error: 'Nom déjà utilisé' };

    const [updated] = await db
      .update(schema.buyerTypes)
      .set({ name, description: input.description?.trim() || null })
      .where(eq(schema.buyerTypes.id, input.id))
      .returning();

    await audit({
      action: 'UPDATE_BUYER_TYPE',
      actorId: userId,
      entityType: 'BuyerType',
      entityId: updated.id,
      newValue: { name: updated.name, description: updated.description },
    });

    return { success: true, data: updated };
  } catch (e: any) {
    console.error('updateBuyerType error:', e);
    return { success: false, error: e?.message || 'Erreur interne' };
  }
}
