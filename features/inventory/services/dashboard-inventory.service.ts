import { db } from '@/src/db';
import type { AgrobusinessAsset } from '@/types/dashboard.index';

export async function fetchDashboardInventoryServer(userId?: string): Promise<AgrobusinessAsset[]> {
  if (!userId) return [];

  const producer = await db.query.producers.findFirst({
    where: (p, { eq }) => eq(p.userId, userId),
    columns: { id: true },
  });
  if (!producer) return [];

  const products = await db.query.products.findMany({
    where: (p, { eq }) => eq(p.producerId, producer.id),
    orderBy: (t, { desc: d }) => [d(t.updatedAt)],
  });

  const now = new Date().toISOString();
  return products.map((p) => ({
    id: p.id,
    unitId: normalizeCategory(p.categoryLabel ?? ''),
    nature: 'CROP',
    lifecycle: 'DORMANT',
    name: p.name,
    quantity: Number(p.quantityForSale ?? 0),
    unit: mapUnit(p.unit),
    purchasePrice: Number(p.price ?? 0) * 0.7,
    marketPrice: Number(p.price ?? 0),
    entryDate: (p.updatedAt ?? p.createdAt ?? new Date()).toISOString(),
    isPerishable: isPerishableCategory(p.categoryLabel),
    storage: 'VENTILÉ',
  }));
}

function mapUnit(unit?: string) {
  const allowed = ['SAC_100', 'SAC_50', 'TONNE', 'KG', 'UNITÉ', 'LITRE'] as const;
  if (unit && allowed.includes(unit as any)) return unit as AgrobusinessAsset['unit'];
  return 'KG';
}

function normalizeCategory(label?: string | null) {
  const lower = (label || '').toLowerCase();
  if (lower.includes('maïs') || lower.includes('mais')) return 'mais';
  if (lower.includes('tomate')) return 'tomate';
  if (lower.includes('volaille') || lower.includes('poussin') || lower.includes('poulet')) return 'elevage';
  return 'global';
}

function isPerishableCategory(label?: string | null) {
  const lower = (label || '').toLowerCase();
  return ['tomate', 'légume', 'legume', 'fruit', 'volaille', 'poussin'].some((token) => lower.includes(token));
}

export default { fetchDashboardInventoryServer };
