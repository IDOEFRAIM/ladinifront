import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count } from 'drizzle-orm';
import { CreateClimaticRegionSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import getUserIdFromSession from "@/lib/get-userId";
import { checkIdRequired } from '@/features/territory/services/territory-shared';

export async function getClimaticRegions() {
  try {
    // Fetch regions and compute zones count in a separate grouped query to avoid using `.with`
    const regions = await db.query.climaticRegions.findMany({
      columns: { id: true, name: true, description: true },
      orderBy: (t, { asc }) => [asc(t.name)]
    });

    const zoneCounts = await db.select({ regionId: schema.zones.climaticRegionId, value: count() })
      .from(schema.zones)
      .groupBy(schema.zones.climaticRegionId);

    const zMap = new Map(zoneCounts.map(c => [c.regionId, c.value]));
    const regionsWithCount = regions.map((r: any) => ({
      ...r,
      _count: { zones: zMap.get(r.id) || 0 }
    }));

    return { success: true, data: regionsWithCount };
  } catch (error) {
    console.error("Erreur chargement régions:", error);
    return { success: false, error: "Impossible de charger les régions." };
  }
}

export async function createClimaticRegion(data: { name: string; description?: string }) {
  const validation = CreateClimaticRegionSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((e: any) => e.message).join(', ') };
  }

  try {
    const existing = await db.query.climaticRegions.findFirst({ where: eq(schema.climaticRegions.name, validation.data.name) });
    if (existing) return { success: false, error: "Cette région existe déjà." };

    const [region] = await db.insert(schema.climaticRegions).values(validation.data).returning();

    const userId = await getUserIdFromSession();
    await audit({
      action: 'CREATE_CLIMATIC_REGION',
      actorId: userId ?? 'system',
      entityType: 'ClimaticRegion',
      entityId: region.id,
      newValue: { name: region.name },
    });

    return { success: true, data: region };
  } catch (error) {
    console.error("Erreur création région:", error);
    return { success: false, error: "Impossible de créer la région." };
  }
}

export async function updateClimaticRegion(id: string, data: { name?: string; description?: string }) {
  const idError = checkIdRequired(id);
  if (idError) return idError;

  try {
    const oldRegion = await db.query.climaticRegions.findFirst({ where: eq(schema.climaticRegions.id, id), columns: { name: true, description: true } });
    const [region] = await db.update(schema.climaticRegions)
      .set({ name: data.name, description: data.description })
      .where(eq(schema.climaticRegions.id, id))
      .returning();

    const userId = await getUserIdFromSession();
    await audit({
      action: 'UPDATE_CLIMATIC_REGION',
      actorId: userId ?? 'system',
      entityType: 'ClimaticRegion',
      entityId: id,
      oldValue: oldRegion,
      newValue: { name: data.name, description: data.description },
    });

    return { success: true, data: region };
  } catch (error) {
    console.error("Erreur mise à jour région:", error);
    return { success: false, error: "Impossible de mettre à jour la région." };
  }
}

export async function deleteClimaticRegion(id: string) {
  const idError = checkIdRequired(id);
  if (idError) return idError;

  try {
    const [{ value: locationsCount }] = await db.select({ value: count() }).from(schema.zones).where(eq(schema.zones.climaticRegionId, id));
    if (locationsCount > 0) {
      return { success: false, error: `Impossible : ${locationsCount} lieu(x) rattaché(s) à cette région.` };
    }

    const oldRegion = await db.query.climaticRegions.findFirst({ where: eq(schema.climaticRegions.id, id), columns: { name: true } });
    await db.delete(schema.climaticRegions).where(eq(schema.climaticRegions.id, id));

    const userId = await getUserIdFromSession();
    await audit({
      action: 'DELETE_CLIMATIC_REGION',
      actorId: userId ?? 'system',
      entityType: 'ClimaticRegion',
      entityId: id,
      oldValue: oldRegion,
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur suppression région:", error);
    return { success: false, error: "Impossible de supprimer la région." };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  LOCATIONS (Hiérarchie Administrative)       ║
// ╚══════════════════════════════════════════════╝
