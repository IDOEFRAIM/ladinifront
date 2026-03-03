// services/governance.ts
// Moteur de règles qui transforme les AgentAction en Anomalies si elles sortent des limites de prix fixées par la LocationSetting.

import { prisma } from "@/lib/prisma";

export async function checkActionConstraints(action: {
  userId?: string;
  locationId?: string;
  actionType: string;
  payload: any;
  status: string;
}) {
  if (!action.locationId) return;

  // Retrieve zone settings for pricing limits
  const priceSettings = await prisma.zoneSetting.findMany({
    where: {
      zoneId: action.locationId,
      key: {
        contains: "PRICE_LIMIT"
      }
    }
  });

interface AgentAction {
    userId?: string;
    locationId?: string;
    actionType: string;
    payload: any;
    status: string;
}

interface LocationSetting {
    key: string;
    value: any;
}

interface SettingsMap {
    [key: string]: any;
}

const settingsMap: SettingsMap = priceSettings.reduce((acc: SettingsMap, curr: LocationSetting) => {
    acc[curr.key] = curr.value;
    return acc;
}, {} as SettingsMap);

  if (action.actionType === "SALE_OFFER") {
    const offeredPrice = action.payload.price;
    const item = action.payload.item;
    const maxPrice = settingsMap[`PRICE_LIMIT_${item}`];

    if (maxPrice && offeredPrice > maxPrice) {
      // Flag Anomaly! High price detected.
      await prisma.anomaly.create({
        data: {
          zoneId: action.locationId,
          source: "agent_constraint",
          level: "warning",
          title: "Prix hors norme détecté",
          message: `L'agent propose ${item} à ${offeredPrice} alors que la limite de zone est ${maxPrice}.`,
          details: { action },
        }
      });
      return false; // Failed check
    }
  }

  return true; // Passed checks
}

export async function createAuditLog(
  actorId: string, 
  action: string, 
  entityId: string, 
  entityType: string, 
  oldValue: any, 
  newValue: any,
  ipAddress?: string
) {
  return prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityId,
      entityType,
      oldValue,
      newValue,
      ipAddress
    }
  });
}
