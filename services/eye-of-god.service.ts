'use server';

import { prisma } from "@/lib/prisma";

export async function getEyeOfGodData(organizationId?: string) {
  try {
    // 1. Stock Globaux (Agrégés par produit et type)
    const stockQuery = organizationId ? { organizationId } : {};
    const rawStocks = await prisma.stock.findMany({
      where: stockQuery,
      include: {
        warehouse: { select: { zone: { select: { id: true, name: true } } } },
        farm: { select: { zone: { select: { id: true, name: true } } } },
      }
    });

    const stockAggregates: Record<string, { totalQuantity: number, unit: string, itemName: string, zones: Set<string> }> = {};
    for (const stock of rawStocks) {
      if (!stockAggregates[stock.itemName]) {
        stockAggregates[stock.itemName] = { totalQuantity: 0, unit: stock.unit, itemName: stock.itemName, zones: new Set() };
      }
      stockAggregates[stock.itemName].totalQuantity += stock.quantity;
      if (stock.warehouse?.zone?.name) stockAggregates[stock.itemName].zones.add(stock.warehouse.zone.name);
      if (stock.farm?.zone?.name) stockAggregates[stock.itemName].zones.add(stock.farm.zone.name);
    }
    
    const formattedStocks = Object.values(stockAggregates).map(s => ({
      ...s,
      zones: Array.from(s.zones)
    }));

    // 2. Activités des Agents (Actions Récentes et Télémétrie)
    const recentAgentActions = await prisma.agentAction.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, phone: true } },
      }
    });

    const pendingActionsCount = await prisma.agentAction.count({
      where: { status: 'PENDING' }
    });

    const failedActionsCount = await prisma.agentAction.count({
      where: { status: 'FAILED' }
    });

    // 3. Suivi des Zones (Anomalies et Statistiques de Zone)
    const activeAnomalies = await prisma.anomaly.findMany({
      where: { isResolved: false },
      include: {
        zone: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    const activeWorkZones = await prisma.workZone.findMany({
      where: organizationId ? { organizationId } : {},
      include: {
        zone: { select: { name: true, code: true } },
        manager: { select: { name: true } }
      }
    });

    return {
      success: true,
      data: {
        stocks: formattedStocks,
        agentActivity: {
          recentActions: recentAgentActions,
          metrics: {
            pending: pendingActionsCount,
            failed: failedActionsCount,
            totalRecent: recentAgentActions.length
          }
        },
        zones: {
          activeWorkZones,
          anomalies: activeAnomalies,
          anomaliesCount: activeAnomalies.length
        }
      }
    };
  } catch (error) {
    console.error("Erreur gérant le dashboard Eye of God:", error);
    return { success: false, error: "Impossible de récupérer les données du tableau de bord" };
  }
}
