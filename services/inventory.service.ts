'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

// Local MovementType alias mirrors Prisma enum MovementType
type MovementType = 'IN' | 'OUT' | 'WASTE';
import { CreateFarmSchema, CreateStockSchema, StockMovementSchema } from "@/lib/validators";
import getUserIdFromSession from "@/lib/get-userId";
import { audit, snapshot } from "@/lib/audit";

// ╔══════════════════════════════════════════════╗
// ║  FERMES                                      ║
// ╚══════════════════════════════════════════════╝

/**
 * Récupère les fermes du producteur connecté
 */
export async function getFarms() {
    const userId = await getUserIdFromSession();
    if (!userId) return { success: false, error: "Session expirée" };

    try {
        const producer = await db.query.producers.findFirst({
            where: eq(schema.producers.userId, userId),
            with: { farms: { orderBy: (t, { desc }) => [desc(t.createdAt)] } }
        });
        return { success: true, data: producer?.farms || [] };
    } catch (error) {
        console.error("Erreur chargement fermes:", error);
        return { success: false, error: "Impossible de charger les fermes." };
    }
}

/**
 * Crée une nouvelle ferme pour le producteur connecté
 */
export async function createFarm(data: {
    name: string;
    location?: string;
    size?: number;
    soilType?: string;
    waterSource?: string;
    zoneId?: string;
}) {
    const userId = await getUserIdFromSession();
    if (!userId) return { success: false, error: "Identification requise" };

    const validation = CreateFarmSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
    }

    try {
        let producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, userId) });

        if (!producer) {
            const user = await db.query.users.findFirst({
                where: eq(schema.users.id, userId),
                columns: { id: true, role: true, name: true }
            });

            if (!user) {
                return { success: false, error: "Utilisateur introuvable." };
            }

            [producer] = await db.insert(schema.producers).values({
                userId: user.id,
                businessName: user.name || "Mon Agrobusiness",
            }).returning();
        }

        const [farm] = await db.insert(schema.farms).values({
            ...validation.data,
            zoneId: data.zoneId || undefined,
            producerId: producer.id
        }).returning();
        return { success: true, data: farm };
    } catch (error) {
        console.error("Erreur création ferme:", error);
        return { success: false, error: "Impossible de créer la ferme." };
    }
}

// ╔══════════════════════════════════════════════╗
// ║  STOCKS                                      ║
// ╚══════════════════════════════════════════════╝

/**
 * Récupère les stocks d'une ferme spécifique
 */
export async function getStocks(farmId: string) {
    if (!farmId) return { success: false, error: "FarmId requis" };

    try {
        const stocks = await db.query.stocks.findMany({
            where: eq(schema.stocks.farmId, farmId),
            with: {
                movements: {
                    orderBy: (t, { desc }) => [desc(t.createdAt)],
                    limit: 5
                }
            },
            orderBy: (t, { desc }) => [desc(t.updatedAt)]
        });
        return { success: true, data: stocks };
    } catch (error) {
        console.error("Erreur chargement stocks:", error);
        return { success: false, error: "Impossible de charger les stocks." };
    }
}

/**
 * Crée un nouvel article en stock avec mouvement initial
 */
export async function createStock(farmId: string, data: {
    itemName: string;
    quantity: number;
    unit: string;
    batchId?: string;
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
            quantity: validation.data.quantity,
            unit: validation.data.unit as any
            }).returning();

            await tx.insert(schema.stockMovements).values({
            stockId: stock.id,
            type: 'IN' as MovementType,
            quantity: validation.data.quantity,
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

/**
 * Calcule la nouvelle quantité après un mouvement
 */
function calculateNewQuantity(type: 'IN' | 'OUT' | 'WASTE', currentQuantity: number, quantity: number): number {
    return type === 'IN' ? currentQuantity + quantity : currentQuantity - quantity;
}

/**
 * Exécute la transaction de mouvement de stock
 */
async function executeStockMovementTransaction(
    txOrDb: any,
    stockId: string,
    userId: string,
    validatedData: any
) {
    const stock = await txOrDb.query.stocks.findFirst({
        where: eq(schema.stocks.id, stockId),
        with: { farm: { with: { producer: { columns: { userId: true } } } } }
    });

    if (!stock) throw new Error("Stock introuvable");
    if (stock.farm?.producer.userId !== userId) throw new Error("Accès refusé");

    const oldQuantity = stock.quantity;
    const newQuantity = calculateNewQuantity(validatedData.type, oldQuantity, validatedData.quantity);

    if (newQuantity < 0) throw new Error("Stock insuffisant pour cette opération");

    await txOrDb.update(schema.stocks)
        .set({ quantity: newQuantity })
        .where(eq(schema.stocks.id, stockId));

    const [movement] = await txOrDb.insert(schema.stockMovements).values({
        stockId,
        type: validatedData.type as MovementType,
        quantity: validatedData.quantity,
        reason: validatedData.reason
    }).returning();

    return { movement, oldQuantity, newQuantity };
}

/**
 * Ajoute un mouvement (Entrée, Sortie, Perte) et met à jour la quantité totale
 */
export async function addStockMovement(stockId: string, data: {
    type: 'IN' | 'OUT' | 'WASTE';
    quantity: number;
    reason?: string;
}) {
    const userId = await getUserIdFromSession();
    if (!stockId || !userId) return { success: false, error: "Identification requise" };

    const validation = StockMovementSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
    }

    try {
        const result = await db.transaction((tx: any) =>
            executeStockMovementTransaction(tx, stockId, userId, validation.data)
        );

        // Audit : mouvement de stock
        await audit({
            actorId: userId,
            action: 'STOCK_MOVEMENT',
            entityId: stockId,
            entityType: 'STOCK',
            oldValue: { quantity: result.oldQuantity },
            newValue: { quantity: result.newQuantity, movementType: validation.data.type },
        });

        return { success: true, data: result.movement };
    } catch (error: any) {
        return { success: false, error: error.message || "Erreur lors du mouvement de stock." };
    }
}