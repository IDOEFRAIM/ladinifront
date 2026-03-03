// services/telemetry.ts
// Gestion des flux GPS et état des batteries des agents (Scale: 10k+ agents)

import { prisma } from "@/lib/prisma";

export async function logAgentTelemetry(userId: string, data: {
  lat: number;
  lng: number;
  battery?: number;
  signal?: string;
}) {
  return await prisma.agentTelemetry.create({
    data: {
      userId,
      latitude: data.lat,
      longitude: data.lng,
      battery: data.battery,
      signal: data.signal,
    },
  });
}

export async function getLiveAgentsInZone(zoneId: string) {
  // Return agents active in the last 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  return await prisma.agentTelemetry.findMany({
    where: {
      createdAt: { gte: fifteenMinutesAgo },
      user: {
        // Filter through organization work zones linked to this location
        organizations: {
          some: {
            organization: {
              workZones: { some: { zoneId } }
            }
          }
        }
      }
    },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    distinct: ['userId'] // Only get the latest point per user
  });
}
