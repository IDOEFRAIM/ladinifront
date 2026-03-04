'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count } from 'drizzle-orm';

export async function getEyeOfGodData(organizationId?: string) {
  try {
    // 1. Stock Globaux (Agrégés par produit et type)
    const stockWhere = organizationId ? eq(schema.stocks.organizationId, organizationId) : undefined;
    // Avoid relying on runtime relation metadata (may be undefined after schema refactor).
    // Fetch warehouses/farms with their zone IDs, then resolve zone names in a second query.
    const rawStocks = await db.query.stocks.findMany({
      where: stockWhere,
      with: {
        warehouse: { columns: { id: true, name: true, zoneId: true } },
        farm: { columns: { id: true, name: true, zoneId: true } },
      }
    });

    // Collect zoneIds to resolve human-friendly names
    const zoneIds = new Set<string>();
    for (const s of rawStocks) {
      if (s.warehouse?.zoneId) zoneIds.add(s.warehouse.zoneId);
      if (s.farm?.zoneId) zoneIds.add(s.farm.zoneId);
    }

    const zoneList = zoneIds.size > 0
      ? await db.query.zones.findMany({ where: (t, { inArray }) => inArray(t.id, Array.from(zoneIds)) })
      : [];
    const zoneMap = new Map(zoneList.map(z => [z.id, z.name]));

    const stockAggregates: Record<string, { totalQuantity: number, unit: string, itemName: string, zones: Set<string> }> = {};
    for (const stock of rawStocks) {
      if (!stockAggregates[stock.itemName]) {
        stockAggregates[stock.itemName] = { totalQuantity: 0, unit: stock.unit, itemName: stock.itemName, zones: new Set() };
      }
      stockAggregates[stock.itemName].totalQuantity += stock.quantity;
      if (stock.warehouse?.zoneId && zoneMap.has(stock.warehouse.zoneId)) stockAggregates[stock.itemName].zones.add(zoneMap.get(stock.warehouse.zoneId)!);
      if (stock.farm?.zoneId && zoneMap.has(stock.farm.zoneId)) stockAggregates[stock.itemName].zones.add(zoneMap.get(stock.farm.zoneId)!);
    }
    
    const formattedStocks = Object.values(stockAggregates).map(s => ({
      ...s,
      zones: Array.from(s.zones)
    }));

    // 2. Activités des Agents (Actions Récentes and Télémétrie)
    // Avoid `with` relation projections which rely on runtime relation metadata.
    const recentAgentActions = await db.query.agentActions.findMany({
      limit: 20,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    // Resolve users for the recent actions explicitly
    const agentUserIds = new Set<string>();
    for (const a of recentAgentActions) if (a.userId) agentUserIds.add(a.userId);
    const agentUsers = agentUserIds.size > 0
      ? await db.query.users.findMany({ where: (t, { inArray }) => inArray(t.id, Array.from(agentUserIds)) })
      : [];
    const agentUserMap = new Map(agentUsers.map(u => [u.id, u]));

    const [{ value: pendingActionsCount }] = await db
      .select({ value: count() })
      .from(schema.agentActions)
      .where(eq(schema.agentActions.status, 'PENDING'));

    const [{ value: failedActionsCount }] = await db
      .select({ value: count() })
      .from(schema.agentActions)
      .where(eq(schema.agentActions.status, 'FAILED'));

    // 3. Suivi des Zones (Anomalies et Statistiques de Zone)
    const activeAnomalies = await db.query.anomalies.findMany({
      where: eq(schema.anomalies.isResolved, false),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 15
    });

    // Resolve anomaly zones
    const anomalyZoneIds = new Set<string>();
    for (const a of activeAnomalies) if (a.zoneId) anomalyZoneIds.add(a.zoneId);
    const anomalyZones = anomalyZoneIds.size > 0
      ? await db.query.zones.findMany({ where: (t, { inArray }) => inArray(t.id, Array.from(anomalyZoneIds)) })
      : [];
    const anomalyZoneMap = new Map(anomalyZones.map(z => [z.id, z]));

    const workZoneWhere = organizationId ? eq(schema.workZones.organizationId, organizationId) : undefined;
    const activeWorkZones = await db.query.workZones.findMany({
      where: workZoneWhere,
    });

    // Resolve zones and managers for work zones
    const workZoneZoneIds = new Set<string>();
    const managerIds = new Set<string>();
    for (const wz of activeWorkZones) {
      if (wz.zoneId) workZoneZoneIds.add(wz.zoneId);
      if (wz.managerId) managerIds.add(wz.managerId);
    }
    const workZonesZones = workZoneZoneIds.size > 0
      ? await db.query.zones.findMany({ where: (t, { inArray }) => inArray(t.id, Array.from(workZoneZoneIds)) })
      : [];
    const workZoneZoneMap = new Map(workZonesZones.map(z => [z.id, z]));
    const managers = managerIds.size > 0
      ? await db.query.users.findMany({ where: (t, { inArray }) => inArray(t.id, Array.from(managerIds)) })
      : [];
    const managerMap = new Map(managers.map(m => [m.id, m]));

    return {
      success: true,
      data: {
        stocks: formattedStocks,
        agentActivity: {
          recentActions: recentAgentActions.map(a => ({
            ...a,
            user: a.userId ? agentUserMap.get(a.userId) ?? null : null,
          })),
          metrics: {
            pending: pendingActionsCount,
            failed: failedActionsCount,
            totalRecent: recentAgentActions.length
          }
        },
        zones: {
          activeWorkZones: activeWorkZones.map(wz => ({
            ...wz,
            zone: wz.zoneId ? workZoneZoneMap.get(wz.zoneId) ?? null : null,
            manager: wz.managerId ? managerMap.get(wz.managerId) ?? null : null,
          })),
          anomalies: activeAnomalies.map(a => ({
            ...a,
            zone: a.zoneId ? anomalyZoneMap.get(a.zoneId) ?? null : null,
          })),
          anomaliesCount: activeAnomalies.length
        }
      }
    };
  } catch (error) {
    console.error("Erreur gérant le dashboard Eye of God:", error);
    return { success: false, error: "Impossible de récupérer les données du tableau de bord" };
  }
}
