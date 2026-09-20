import { CreateFarmSchema, CreateStockSchema, StockMovementSchema } from "@/lib/validators";
import getUserIdFromSession from "@/lib/get-userId";
import { audit, snapshot } from "@/lib/audit";
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { asError } from '@/lib/errors';

// Local MovementType alias mirrors Prisma enum MovementType
export type MovementType = 'IN' | 'OUT' | 'WASTE';

// ╔══════════════════════════════════════════════╗
// ║  FERMES                                      ║
// ╚══════════════════════════════════════════════╝

/**
 * Calcule la nouvelle quantité après un mouvement
 */
export function calculateNewQuantity(type: 'IN' | 'OUT' | 'WASTE', currentQuantity: number, quantity: number): number {
    return type === 'IN' ? currentQuantity + quantity : currentQuantity - quantity;
}

/**
 * Exécute la transaction de mouvement de stock
 */
export async function executeStockMovementTransaction(
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
    } catch (_error: unknown) {
    const error = asError(_error);
        return { success: false, error: error.message || "Erreur lors du mouvement de stock." };
    }
}
