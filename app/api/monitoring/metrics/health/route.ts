// app/api/monitoring/metrics/health/route.ts
// =========================================================
// API SANTÉ DES AGENTS — État de chaque agent
// Accès : ADMIN uniquement
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte, count, avg } from 'drizzle-orm';
import { requireAdmin } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Récupérer tous les agents actifs
    const agentNames = await db.select({
      agentName: schema.agentActions.agentName,
      agentCount: count(),
    }).from(schema.agentActions).groupBy(schema.agentActions.agentName);

    const healthStatuses = await Promise.all(
      agentNames.map(async (agent) => {
        const agentName = agent.agentName;

        const [
          actionsLast24hResult,
          failedLast24hResult,
          lastAction,
          avgResponseTimeResult,
        ] = await Promise.all([
          // Actions dans les 24h
          db.select({ value: count() }).from(schema.agentActions).where(
            and(
              eq(schema.agentActions.agentName, agentName),
              gte(schema.agentActions.createdAt, twentyFourHoursAgo),
            )
          ),

          // Erreurs dans les 24h
          db.select({ value: count() }).from(schema.agentActions).where(
            and(
              eq(schema.agentActions.agentName, agentName),
              eq(schema.agentActions.status, 'FAILED'),
              gte(schema.agentActions.createdAt, twentyFourHoursAgo),
            )
          ),

          // Dernière activité
          db.query.agentActions.findFirst({
            where: eq(schema.agentActions.agentName, agentName),
            orderBy: (t, { desc: d }) => [d(t.createdAt)],
            columns: { createdAt: true },
          }),

          // Temps de réponse moyen (via conversations)
          db.select({
            avgMs: avg(schema.conversations.responseTimeMs),
          }).from(schema.conversations).where(
            and(
              eq(schema.conversations.agentType, agentName.toLowerCase().replace('agent', '')),
              gte(schema.conversations.createdAt, twentyFourHoursAgo),
            )
          ),
        ]);

        const actionsLast24h = Number(actionsLast24hResult[0]?.value ?? 0);
        const failedLast24h = Number(failedLast24hResult[0]?.value ?? 0);

        // Calculer l'état de santé
        const errorRate = actionsLast24h > 0 ? failedLast24h / actionsLast24h : 0;
        const lastActivityAt = lastAction?.createdAt;
        const isRecent = lastActivityAt && lastActivityAt > oneHourAgo;

        let status: 'healthy' | 'degraded' | 'down' | 'unknown';
        if (!lastActivityAt) {
          status = 'unknown';
        } else if (!isRecent) {
          status = 'down';
        } else if (errorRate > 0.3) {
          status = 'degraded';
        } else {
          status = 'healthy';
        }

        return {
          agentName,
          status,
          lastActivityAt: lastActivityAt?.toISOString(),
          actionsLast24h,
          errorRate: Math.round(errorRate * 100) / 100,
          avgResponseTimeMs: Math.round(Number(avgResponseTimeResult[0]?.avgMs) || 0),
        };
      })
    );

    return NextResponse.json(healthStatuses);
  } catch (err) {
    console.error('[API] /monitoring/metrics/health error:', err);
    return NextResponse.json(
      { error: 'Erreur lors du calcul de la santé des agents.' },
      { status: 500 }
    );
  }
}
