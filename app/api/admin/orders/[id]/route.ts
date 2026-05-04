import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { assertTransition } from '@/lib/orderStateMachine';
import { runOrderStatusHooks } from '@/services/order.hooks';

export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.indexOf('orders') + 1];
    const body = await req.json();
    const status = body.status;
    if (!status) return NextResponse.json({ error: 'Missing status' }, { status: 400 });

    // 1. Load current order
    const current = await db.query.orders.findFirst({
      where: eq(schema.orders.id, id),
      columns: { id: true, status: true },
    });
    if (!current) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });

    // 2. Validate transition via state machine
    let validatedStatus: string;
    try {
      validatedStatus = assertTransition(current.status as string, status);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }

    // 3. Persist
    const [updated] = await db.update(schema.orders)
      .set({ status: validatedStatus as any })
      .where(eq(schema.orders.id, id))
      .returning({ id: schema.orders.id, status: schema.orders.status });

    if (!updated) return NextResponse.json({ error: 'Erreur de mise à jour' }, { status: 500 });

    // 4. Post-transition hooks (delivery creation + notification)
    await runOrderStatusHooks(updated.id, validatedStatus);

    return NextResponse.json({ success: true, order: updated });
  } catch (e) {
    console.error('api/admin/orders/[id] PATCH error', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
