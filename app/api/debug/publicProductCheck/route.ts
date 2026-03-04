import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id query param is required' }, { status: 400 });

    // Optional simple protection: require DEBUG_API_KEY if set
    const debugKey = process.env.DEBUG_API_KEY;
    if (debugKey) {
      const provided = url.searchParams.get('key') || '';
      if (provided !== debugKey) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const product = await db.query.products.findFirst({
      where: eq(schema.products.id, id),
      columns: { id: true, name: true, quantityForSale: true, updatedAt: true },
    });

    if (!product) return NextResponse.json({ found: false, id });

    return NextResponse.json({
      found: true,
      id: product.id,
      name: product.name ?? null,
      quantityForSale: product.quantityForSale ?? null,
      updatedAt: product.updatedAt ?? null,
    });
  } catch (err) {
    console.error('debug/publicProductCheck error:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
