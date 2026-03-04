import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { requireProducer } from '@/lib/api-guard';
import { AgrobusinessAsset } from '@/types/dashboard.index';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireProducer(req);
    if (error || !user) return error!;

    if (!user.producerId) {
      return NextResponse.json([]);
    }

    const producer = await db.query.producers.findFirst({
      where: eq(schema.producers.id, user.producerId),
      with: {
        farms: { with: { inventory: true } },
        products: true,
      },
    });

    if (!producer) {
      return NextResponse.json([]);
    }

    const assets: AgrobusinessAsset[] = [];

    producer.products.forEach(p => {
      if (p.quantityForSale > 0) {
        assets.push({
          id: `prod-${p.id}`,
          unitId: normalizeCategory(p.categoryLabel),
          nature: 'CROP',
          lifecycle: 'DORMANT',
          name: p.name,
          quantity: p.quantityForSale,
          unit: p.unit as any,
          purchasePrice: p.price * 0.7,
          marketPrice: p.price,
          entryDate: p.updatedAt.toISOString(),
          isPerishable: ['tomate', 'légume', 'fruit'].some(k =>
            p.categoryLabel.toLowerCase().includes(k)
          ),
          storage: 'VENTILÉ',
        });
      }
    });

    producer.farms.forEach(farm => {
      farm.inventory.forEach(stock => {
        assets.push({
          id: `stock-${stock.id}`,
          unitId: normalizeCategory(stock.itemName),
          nature: stock.type === 'HARVEST' ? 'CROP' : 'LIVESTOCK',
          lifecycle: 'DORMANT',
          name: stock.itemName,
          quantity: stock.quantity,
          unit: stock.unit as any,
          purchasePrice: 0,
          marketPrice: 0,
          entryDate: stock.updatedAt.toISOString(),
          isPerishable: false,
          storage: 'PLEIN_AIR',
        });
      });
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error("Dashboard Inventory Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function normalizeCategory(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('maïs') || lower.includes('mais')) return 'mais';
  if (lower.includes('tomate')) return 'tomate';
  if (lower.includes('oignon')) return 'igname';
  if (lower.includes('volaille') || lower.includes('poule') || lower.includes('poulet'))
    return 'elevage';
  return 'global';
}
