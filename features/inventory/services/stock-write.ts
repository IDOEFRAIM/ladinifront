import { CreateStockSchema } from "@/lib/validators";
import getUserIdFromSession from "@/lib/get-userId";
import { audit, snapshot } from "@/lib/audit";
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { MovementType } from '@/features/inventory/services/stock-movements';

/**
 * Crée un nouvel article en stock avec mouvement initial
 */
export async function createStock(farmId: string, data: {
    itemName: string;
    quantity: number;
    unit: string;
    batchId?: string;
    type?: 'HARVEST' | 'INPUT' | 'EQUIPMENT';
}) {
    if (!farmId) return { success: false, error: "FarmId requis" };

    const validation = CreateStockSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
    }

    try {
        const result = await db.transaction(async (tx) => {
            const [stock] = await tx.insert(schema.stocks).values({
            farmId,
            itemName: validation.data.itemName,
            quantity: String(validation.data.quantity),
            unit: validation.data.unit as any,
            // Persist type when provided, otherwise allow DB default
            ...(validation.data.type ? { type: validation.data.type as any } : {})
            }).returning();

            await tx.insert(schema.stockMovements).values({
            stockId: stock.id,
            type: 'IN' as MovementType,
            quantity: String(validation.data.quantity),
            reason: 'Inventaire initial'
            });

            return stock;
        });

        // Audit : création de stock
        const userId = await getUserIdFromSession();
        if (userId) {
            await audit({
                actorId: userId,
                action: 'CREATE_STOCK',
                entityId: result.id,
                entityType: 'STOCK',
                newValue: { farmId, ...validation.data },
            });
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("Erreur création stock:", error);
        return { success: false, error: "Impossible de créer le stock." };
    }
}

/**
 * Supprime un stock (vérifie d'abord l'identité via cookie)
 */
export async function deleteStock(stockId: string) {
    const userId = await getUserIdFromSession();
    if (!stockId || !userId) return { success: false, error: "Non autorisé ou ID manquant" };

    try {
        // Sécurité : Vérifier que le stock appartient bien au producteur connecté
        const stock = await db.query.stocks.findFirst({
            where: eq(schema.stocks.id, stockId),
            with: { farm: { with: { producer: { columns: { userId: true } } } } }
        });

        if (!stock || stock.farm?.producer.userId !== userId) {
            return { success: false, error: "Vous n'avez pas le droit de supprimer ce stock." };
        }

        const oldValue = await snapshot(stock);
        await db.delete(schema.stocks).where(eq(schema.stocks.id, stockId));

        // Audit : suppression de stock
        await audit({
            actorId: userId,
            action: 'DELETE_STOCK',
            entityId: stockId,
            entityType: 'STOCK',
            oldValue,
        });

        return { success: true };
    } catch (error) {
        console.error("Erreur suppression stock:", error);
        return { success: false, error: "Impossible de supprimer le stock." };
    }
}

// ╔══════════════════════════════════════════════╗
// ║  MOUVEMENTS DE STOCK                          ║
// ╚══════════════════════════════════════════════╝
