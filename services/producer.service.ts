'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, inArray, count } from 'drizzle-orm';
import getUserIdFromSession  from "@/lib/get-userId";
import { audit, snapshot } from "@/lib/audit";

export async function getMyProducts() {
    // 1. Récupération de l'ID via le cookie (Serveur)
    const userId = await getUserIdFromSession();
    if (!userId) return { success: false, error: "Session expirée. Veuillez vous reconnecter." };

    try {
        const producer = await db.query.producers.findFirst({
            where: eq(schema.producers.userId, userId),
            with: {
                products: {
                    orderBy: (t, { desc }) => [desc(t.updatedAt)],
                    columns: {
                        id: true,
                        name: true,
                        categoryLabel: true,
                        price: true,
                        unit: true,
                        quantityForSale: true,
                        images: true,
                        audioUrl: true,
                        createdAt: true,
                        updatedAt: true,
                    }
                }
            }
        });

        if (!producer) {
            return { success: false, error: "Profil producteur introuvable." };
        }

        return { success: true, data: producer.products };
    } catch (error) {
        console.error("Erreur chargement catalogue:", error);
        return { success: false, error: "Erreur lors du chargement du catalogue." };
    }
}

export async function deleteProduct(productId: string) {
    const userId = await getUserIdFromSession();
    if (!productId || !userId) return { success: false, error: "Paramètres manquants ou non autorisé" };

    try {
        // Vérification que le produit appartient bien au producteur connecté
        const product = await db.query.products.findFirst({
            where: eq(schema.products.id, productId),
            with: { producer: { columns: { userId: true } } }
        });

        // Sécurité critique : on compare l'ID du cookie avec l'ID du propriétaire
        if (!product || product.producer.userId !== userId) {
            return { success: false, error: "Non autorisé : vous n'êtes pas le propriétaire." };
        }

        // Vérifier qu'il n'y a pas de commandes en cours
        const [{ value: activeOrders }] = await db
            .select({ value: count() })
            .from(schema.orderItems)
            .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
            .where(and(
                eq(schema.orderItems.productId, productId),
                inArray(schema.orders.status, ['PENDING', 'CONFIRMED', 'SHIPPED'])
            ));

        if (activeOrders > 0) {
            return { success: false, error: "Impossible de supprimer : commandes en cours sur ce produit." };
        }

        await db.delete(schema.products).where(eq(schema.products.id, productId));

        // Audit : suppression de produit
        await audit({
            actorId: userId,
            action: 'DELETE_PRODUCT',
            entityId: productId,
            entityType: 'PRODUCT',
            oldValue: { producerId: product.producer.userId },
        });

        return { success: true };
    } catch (error) {
        console.error("Erreur suppression produit:", error);
        return { success: false, error: "Erreur lors de la suppression." };
    }
}

export async function toggleProductAvailability(productId: string) {
    const userId = await getUserIdFromSession();
    if (!productId || !userId) return { success: false, error: "Paramètres manquants" };

    try {
        const product = await db.query.products.findFirst({
            where: eq(schema.products.id, productId),
            columns: {
                id: true,
                quantityForSale: true,
            },
            with: { producer: { columns: { userId: true } } }
        });

        if (!product || product.producer.userId !== userId) {
            return { success: false, error: "Non autorisé." };
        }

        const newQuantity = product.quantityForSale > 0 ? 0 : 1;

        await db.update(schema.products)
            .set({ quantityForSale: newQuantity })
            .where(eq(schema.products.id, productId));

        // Audit : toggle disponibilité
        await audit({
            actorId: userId,
            action: 'TOGGLE_PRODUCT_AVAILABILITY',
            entityId: productId,
            entityType: 'PRODUCT',
            oldValue: { quantityForSale: product.quantityForSale },
            newValue: { quantityForSale: newQuantity },
        });

        return { 
            success: true, 
            active: newQuantity > 0,
            message: newQuantity > 0 ? "Produit remis en vente" : "Produit retiré du catalogue"
        };
    } catch (error) {
        return { success: false, error: "Erreur lors de la mise à jour." };
    }
}