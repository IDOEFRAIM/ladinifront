'use server';

import { prisma } from "@/lib/prisma";
import { CreateClimaticRegionSchema, CreateLocationSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import getUserIdFromSession from "@/lib/get-userId";

// ╔══════════════════════════════════════════════╗
// ║  RÉGIONS CLIMATIQUES                         ║
// ╚══════════════════════════════════════════════╝

export async function getClimaticRegions() {
  try {
    const regions = await prisma.climaticRegion.findMany({
      include: {
        zones: {
          select: { id: true, name: true, code: true, isActive: true },
          orderBy: { name: 'asc' }
        },
        _count: { select: { zones: true } }
      },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: regions };
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
    const existing = await prisma.climaticRegion.findUnique({ where: { name: validation.data.name } });
    if (existing) return { success: false, error: "Cette région existe déjà." };

    const region = await prisma.climaticRegion.create({ data: validation.data });

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

function checkIdRequired(id: string) {
  if (!id) return { success: false, error: "ID requis" };
  return null;
}

export async function updateClimaticRegion(id: string, data: { name?: string; description?: string }) {
  const idError = checkIdRequired(id);
  if (idError) return idError;

  try {
    const oldRegion = await prisma.climaticRegion.findUnique({ where: { id }, select: { name: true, description: true } });
    const region = await prisma.climaticRegion.update({
      where: { id },
      data: { name: data.name, description: data.description }
    });

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
    const locationsCount = await prisma.zone.count({ where: { climaticRegionId: id } });
    if (locationsCount > 0) {
      return { success: false, error: `Impossible : ${locationsCount} lieu(x) rattaché(s) à cette région.` };
    }

    const oldRegion = await prisma.climaticRegion.findUnique({ where: { id }, select: { name: true } });
    await prisma.climaticRegion.delete({ where: { id } });

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

export async function getLocations(climaticRegionId?: string) {
  try {
    const where = climaticRegionId ? { climaticRegionId } : undefined;
    const locations = await prisma.zone.findMany({
      where,
      include: {
        climaticRegion: { select: { id: true, name: true } },
        _count: {
          select: { producers: true, orders: true, farms: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: locations };
  } catch (error) {
    console.error("Erreur chargement locations:", error);
    return { success: false, error: "Impossible de charger les locations." };
  }
}

export async function getLocationTree() {
  try {
    const locations = await prisma.zone.findMany({
      include: {
        _count: { select: { producers: true, farms: true } }
      },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: locations };
  } catch (error) {
    console.error("Erreur chargement arbre:", error);
    return { success: false, error: "Impossible de charger l'arbre territorial." };
  }
}

export async function createLocation(data: {
  name: string;
  code: string;
  parentId?: string;
  climaticRegionId?: string;
}) {
  const validation = CreateLocationSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((e: any) => e.message).join(', ') };
  }

  try {
    const payload: any = {
      name: validation.data.name,
      code: validation.data.code,
      climaticRegionId: validation.data.climaticRegionId || undefined,
    };
    const location = await prisma.zone.create({ data: payload });

    const userId = await getUserIdFromSession();
    await audit({
      action: 'CREATE_LOCATION',
      actorId: userId ?? 'system',
      entityType: 'Location',
      entityId: location.id,
      newValue: { name: location.name, code: location.code },
    });

    return { success: true, data: location };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "Ce nom ou code de location existe déjà." };
    }
    console.error("Erreur création location:", error);
    return { success: false, error: "Impossible de créer la location." };
  }
}

export async function updateLocation(id: string, data: Partial<{
  name: string;
  code: string;
  parentId: string;
  climaticRegionId: string;
  isActive: boolean;
}>) {
  const idError = checkIdRequired(id);
  if (idError) return idError;

  try {
    const oldLocation = await prisma.zone.findUnique({
      where: { id },
      select: { name: true, code: true, isActive: true }
    });
    const location = await prisma.zone.update({ where: { id }, data: data as any });

    const userId = await getUserIdFromSession();
    await audit({
      action: 'UPDATE_LOCATION',
      actorId: userId ?? 'system',
      entityType: 'Location',
      entityId: id,
      oldValue: oldLocation,
      newValue: data,
    });

    return { success: true, data: location };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "Ce code de location existe déjà." };
    }
    console.error("Erreur mise à jour location:", error);
    return { success: false, error: "Impossible de mettre à jour la location." };
  }
}

export async function toggleLocationActive(id: string) {
  const idError = checkIdRequired(id);
  if (idError) return idError;

  try {
    const location = await prisma.zone.findUnique({ where: { id } });
    if (!location) return { success: false, error: "Location introuvable." };

    const updated = await prisma.zone.update({
      where: { id },
      data: { isActive: !location.isActive }
    });

    const userId = await getUserIdFromSession();
    await audit({
      action: 'TOGGLE_LOCATION_ACTIVE',
      actorId: userId ?? 'system',
      entityType: 'Location',
      entityId: id,
      oldValue: { isActive: location.isActive },
      newValue: { isActive: updated.isActive },
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error("Erreur toggle location:", error);
    return { success: false, error: "Impossible de basculer l'état de la location." };
  }
}

export async function deleteLocation(id: string) {
  try {
    const counts = await prisma.zone.findUnique({
      where: { id },
      include: { _count: { select: { producers: true, orders: true, farms: true } } }
    });
    const total = (counts?._count.producers || 0) + (counts?._count.orders || 0) + (counts?._count.farms || 0);
    if (total > 0) {
      return { success: false, error: `Impossible : ${total} entité(s) liée(s) à cette location.` };
    }

    const oldLoc = await prisma.zone.findUnique({ where: { id }, select: { name: true, code: true } });
    await prisma.zone.delete({ where: { id } });

    const userId = await getUserIdFromSession();
    await audit({
      action: 'DELETE_LOCATION',
      actorId: userId ?? 'system',
      entityType: 'Location',
      entityId: id,
      oldValue: oldLoc,
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur suppression location:", error);
    return { success: false, error: "Impossible de supprimer la location." };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  ADMIN LEVELS                                ║
// ╚══════════════════════════════════════════════╝

// Admin levels were removed from the schema; placeholder removed.

// ╔══════════════════════════════════════════════╗
// ║  STATISTIQUES TERRITORIALES                  ║
// ╚══════════════════════════════════════════════╝

export async function getTerritoryStats() {
  try {
    const [
      totalLocations,
      activeLocations,
      totalRegions,
      totalProducers,
      totalOrders,
      locationStats
    ] = await Promise.all([
      prisma.zone.count(),
      prisma.zone.count({ where: { isActive: true } }),
      prisma.climaticRegion.count(),
      prisma.producer.count(),
      prisma.order.count(),
      prisma.zone.findMany({
        include: {
          climaticRegion: { select: { name: true } },
          _count: {
            select: { producers: true, orders: true, farms: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    ]);

    const mappedStats = locationStats.map((l: any) => ({
      id: l.id,
      name: l.name,
      code: l.code,
      isActive: l.isActive,
      climaticRegion: l.climaticRegion?.name || null,
      producers: l._count.producers,
      orders: l._count.orders,
      farms: l._count.farms,
    }));

    return {
      success: true,
      data: {
        totalLocations,
        activeLocations,
        totalRegions,
        totalProducers,
        totalOrders,
        locationStats: mappedStats,
      }
    };
  } catch (error) {
    console.error("Erreur stats territoire:", error);
    return { success: false, error: "Impossible de charger les statistiques." };
  }
}

// Legacy aliases
export const getZones = getLocations;
export const createZone = createLocation;
export const updateZone = updateLocation;
export const toggleZoneActive = toggleLocationActive;
export const deleteZone = deleteLocation;
