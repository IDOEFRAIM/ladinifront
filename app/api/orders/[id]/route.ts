import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UpdateOrderStatusSchema } from '@/lib/validators';
import { getAuthenticatedUser, requireProducer } from '@/lib/api-guard';
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
        const producer = await prisma.producer.findUnique({
            where: { userId: user.id },
            select: { id: true }
        });

        if (!producer) {
            return NextResponse.json({ error: "Profil producteur introuvable" }, { status: 404 });
        }

        // 3. Récupération de la commande avec ses articles filtrés pour CE producteur
        // Note: On utilise findUnique pour la commande et on vérifie l'existence d'items liés au producteur
        const order = await prisma.order.findUnique({
            where: { id },
            select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                customerName: true,
                customerPhone: true,
                city: true,
                deliveryDesc: true,
                buyer: { select: { name: true, phone: true } },
                status: true,
                items: {
                    where: { product: { producerId: producer.id } },
                    include: { product: { select: { name: true, unit: true } } }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
        }

        if (order.items.length === 0) {
            return NextResponse.json({ error: "Accès refusé : Aucun de vos produits n'est dans cette commande" }, { status: 403 });
        }

        // 4. Calcul du sous-total spécifique au producteur
        let producerSubtotal = 0;
        const formattedItems = order.items.map(item => {
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
        const producer = await prisma.producer.findUnique({
            where: { userId: user.id },
            select: { id: true }
        });

        const ownershipCheck = await prisma.orderItem.findFirst({
            where: {
                orderId: id,
                product: { producerId: producer?.id }
            }
        });

        if (!ownershipCheck) {
            const canModifyAny = await userHasPermission(user.id, 'ORDER_MODIFY_ANY');
            if (!canModifyAny) {
                return NextResponse.json({ error: "Action non autorisée sur cette commande" }, { status: 403 });
            }
        }

        // 4. Mise à jour
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status: validation.data.statusId as any },
            select: {
                id: true,
                status: true,
                updatedAt: true
            }
        });

        return NextResponse.json(updatedOrder);

    } catch (error) {
        console.error("PATCH /api/orders/[id] Error:", error);
        return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }
}