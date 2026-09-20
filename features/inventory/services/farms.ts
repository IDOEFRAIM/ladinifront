import { CreateFarmSchema } from "@/lib/validators";
import getUserIdFromSession from "@/lib/get-userId";
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

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
