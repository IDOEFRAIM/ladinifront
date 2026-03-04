import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { UpdateOrderStatusSchema } from '@/lib/validators';
import { requireProducer } from '@/lib/api-guard';
import { userHasPermission } from '@/services/role.service';

/**
 * GET : Récupère les détails d'une commande spécifique pour un producteur
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        // 1. Authentification
        const { user, error } = await requireProducer(req);
        if (error || !user) return error!;

        // 2. Récupération du profil producteur
        const producer = await db.query.producers.findFirst({
            where: eq(schema.producers.userId, user.id),
            columns: { id: true }
        });

        if (!producer) {
            return NextResponse.json({ error: "Profil producteur introuvable" }, { status: 404 });
        }

        // 3. Récupération de la commande
        const order = await db.query.orders.findFirst({
            where: eq(schema.orders.id, id),
            columns: {
                id: true,
                createdAt: true,
                updatedAt: true,
                customerName: true,
                customerPhone: true,
                city: true,
                deliveryDesc: true,
                status: true,
            },
            with: {
                buyer: { columns: { name: true, phone: true } },
            },
        });

        if (!order) {
            return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
        }

        // Get producer's product IDs and filter order items
        const producerProducts = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.producerId, producer.id));
        const productIds = producerProducts.map(p => p.id);

        const filteredItems = await db.query.orderItems.findMany({
            where: and(
                eq(schema.orderItems.orderId, id),
                inArray(schema.orderItems.productId, productIds),
            ),
            with: { product: { columns: { name: true, unit: true } } },
        });

        if (filteredItems.length === 0) {
            return NextResponse.json({ error: "Accès refusé : Aucun de vos produits n'est dans cette commande" }, { status: 403 });
        }

        // 4. Calcul du sous-total spécifique au producteur
        let producerSubtotal = 0;
        const formattedItems = filteredItems.map(item => {
            const price = item.priceAtSale;
            producerSubtotal += item.quantity * price;
            return {
                id: item.id,
                name: item.product.name,
                quantity: item.quantity,
                unit: item.product.unit,
                price: price
            };
        });

        // 5. Réponse formatée pour le front-end
        return NextResponse.json({
            id: order.id,
            customerName: order.buyer?.name || order.customerName || "Client",
            customerPhone: order.buyer?.phone || order.customerPhone || "",
            location: order.city || order.deliveryDesc || "Lieu non précisé",
            date: order.createdAt,
            total: producerSubtotal,
            status: (String(order.status || 'PENDING')).toLowerCase(),
            items: formattedItems,
            deliveryFee: 1500 // Optionnel: à dynamiser si stocké en DB
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
        
        // 1. Authentification
        const { user, error } = await requireProducer(req);
        if (error || !user) return error!;

        // 2. Validation du body
        const body = await req.json();
        const validation = UpdateOrderStatusSchema.safeParse(body);
        
        if (!validation.success) {
            return NextResponse.json({ 
                error: "Statut invalide", 
                details: validation.error.format() 
            }, { status: 400 });
        }

        // 3. Vérification de propriété (Un producteur peut-il modifier cette commande ?)
        const producer = await db.query.producers.findFirst({
            where: eq(schema.producers.userId, user.id),
            columns: { id: true }
        });

        // Get producer's product IDs for ownership check
        const producerProducts = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.producerId, producer?.id ?? ''));
        const productIds = producerProducts.map(p => p.id);

        const ownershipCheck = productIds.length > 0
            ? await db.query.orderItems.findFirst({
                where: and(
                    eq(schema.orderItems.orderId, id),
                    inArray(schema.orderItems.productId, productIds),
                ),
              })
            : null;

        if (!ownershipCheck) {
            const canModifyAny = await userHasPermission(user.id, 'ORDER_MODIFY_ANY');
            if (!canModifyAny) {
                return NextResponse.json({ error: "Action non autorisée sur cette commande" }, { status: 403 });
            }
        }

        // 4. Mise à jour
        const [updatedOrder] = await db.update(schema.orders).set({ status: validation.data.statusId as any }).where(eq(schema.orders.id, id)).returning({
            id: schema.orders.id,
            status: schema.orders.status,
            updatedAt: schema.orders.updatedAt,
        });

        return NextResponse.json(updatedOrder);

    } catch (error) {
        console.error("PATCH /api/orders/[id] Error:", error);
        return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }
}