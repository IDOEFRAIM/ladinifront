'use server';

import { prisma } from "@/lib/prisma";
import getUserIdFromSession  from "@/lib/get-userId";
import { audit, snapshot } from "@/lib/audit";

export async function getMyProducts() {
    // 1. Récupération de l'ID via le cookie (Serveur)
    const userId = await getUserIdFromSession();
    if (!userId) return { success: false, error: "Session expirée. Veuillez vous reconnecter." };

    try {
        const producer = await prisma.producer.findUnique({
            where: { userId },
            select: {
                products: {
                    orderBy: { updatedAt: 'desc' },
                    select: {
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
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { producer: { select: { userId: true } } }
        });

        // Sécurité critique : on compare l'ID du cookie avec l'ID du propriétaire
        if (!product || product.producer.userId !== userId) {
            return { success: false, error: "Non autorisé : vous n'êtes pas le propriétaire." };
        }

        // Vérifier qu'il n'y a pas de commandes en cours
        const activeOrders = await prisma.orderItem.count({
            where: {
                productId,
                order: {
                    status: { in: ['PENDING', 'CONFIRMED', 'SHIPPED'] }
                }
            }
        });

        if (activeOrders > 0) {
            return { success: false, error: "Impossible de supprimer : commandes en cours sur ce produit." };
        }

        await prisma.product.delete({ where: { id: productId } });

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
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
                id: true,
                quantityForSale: true,
                producer: { select: { userId: true } }
            }
        });

        if (!product || product.producer.userId !== userId) {
            return { success: false, error: "Non autorisé." };
        }

        const newQuantity = product.quantityForSale > 0 ? 0 : 1;

        await prisma.product.update({
            where: { id: productId },
            data: { quantityForSale: newQuantity }
        });

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