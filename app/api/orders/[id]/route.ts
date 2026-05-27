import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { requireProducer } from '@/lib/api-guard';
import { canTransition, DELIVERY_STATUSES, ORDER_STATUSES_STRICT } from '@/lib/orderStateMachine';

const patchOrderSchema = z
    .object({
        status: z.enum(ORDER_STATUSES_STRICT).optional(),
        deliveryStatus: z.enum(DELIVERY_STATUSES).optional(),
    })
    .refine((v) => !!(v.status || v.deliveryStatus), {
        message: 'Au moins un champ doit être fourni: status ou deliveryStatus',
    });

/**
 * GET : Récupère les détails d'une commande spécifique pour un producteur
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { user, error } = await requireProducer(req);
        if (error || !user) return error!;

                const { fetchOrderDetailsForProducer } = await import('@/app/actions/orders.server');
                const details = await fetchOrderDetailsForProducer(id, user.id);
        if (!details) return NextResponse.json({ error: 'Commande introuvable ou accès refusé' }, { status: 404 });

                const row = await db.query.orders.findFirst({
                    where: eq(schema.orders.id, id),
                    columns: { status: true, deliveryStatus: true },
                });

                return NextResponse.json({
                    ...details,
                    status: String(row?.status ?? (details as any)?.status ?? 'PENDING').toUpperCase(),
                    deliveryStatus: String(row?.deliveryStatus ?? (details as any)?.deliveryStatus ?? 'PENDING').toUpperCase(),
                });

    } catch (error) {
        console.error("GET /api/orders/[id] Error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

/**
 * PATCH : Met à jour le statut d'une commande
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { user, error } = await requireProducer(req);
        if (error || !user) return error!;

                const rawBody = await req.json().catch(() => ({}));
                const validation = patchOrderSchema.safeParse(rawBody);
                if (!validation.success) {
                    return NextResponse.json(
                        { error: 'Payload invalide', details: validation.error.format() },
                        { status: 400 }
                    );
                }

                const existing = await db.query.orders.findFirst({
                    where: eq(schema.orders.id, id),
                    columns: { id: true, status: true, deliveryStatus: true },
                });
                if (!existing) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });

                // Authorization: producer must own at least one item in this order
                const producer = await db.query.producers.findFirst({
                    where: eq(schema.producers.userId, user.id),
                    columns: { id: true },
                });
                if (!producer) return NextResponse.json({ error: 'Profil producteur introuvable' }, { status: 403 });

                const ownership = await db
                    .select({ orderId: schema.orderItems.orderId })
                    .from(schema.orderItems)
                    .innerJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
                    .where(and(eq(schema.orderItems.orderId, id), eq(schema.products.producerId, producer.id)))
                    .limit(1);

                if (ownership.length === 0) {
                    return NextResponse.json({ error: 'Action non autorisée sur cette commande' }, { status: 403 });
                }

                const updates: Partial<typeof schema.orders.$inferInsert> & { updatedAt?: Date } = {
                    updatedAt: new Date(),
                };

                if (validation.data.status) {
                    const nextStatus = validation.data.status.toUpperCase();
                    const currentStatus = String(existing.status ?? 'PENDING').toUpperCase();
                    if (!canTransition(currentStatus, nextStatus)) {
                        return NextResponse.json(
                            { error: `Transition invalide: ${currentStatus} -> ${nextStatus}` },
                            { status: 400 }
                        );
                    }
                    updates.status = nextStatus as any;
                }

                if (validation.data.deliveryStatus) {
                    updates.deliveryStatus = validation.data.deliveryStatus.toUpperCase() as any;
                }

                const [updated] = await db
                    .update(schema.orders)
                    .set(updates)
                    .where(eq(schema.orders.id, id))
                    .returning();

                const { fetchOrderDetailsForProducer } = await import('@/app/actions/orders.server');
                const details = await fetchOrderDetailsForProducer(id, user.id);

                return NextResponse.json(
                    {
                        ...(details ?? {}),
                        id: updated?.id ?? id,
                        status: String(updated?.status ?? existing.status ?? 'PENDING').toUpperCase(),
                        deliveryStatus: String(updated?.deliveryStatus ?? existing.deliveryStatus ?? 'PENDING').toUpperCase(),
                    },
                    { status: 200 }
                );

    } catch (error) {
        console.error("PATCH /api/orders/[id] Error:", error);
        return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }
}