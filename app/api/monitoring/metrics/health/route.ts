// app/api/monitoring/metrics/health/route.ts
// =========================================================
// API SANTÉ DES AGENTS — État de chaque agent
// Accès : ADMIN uniquement
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Récupérer tous les agents actifs
    const agentNames = await prisma.agentAction.groupBy({
      by: ['agentName'],
      _count: { agentName: true },
    });

    const healthStatuses = await Promise.all(
      agentNames.map(async (agent) => {
        const agentName = agent.agentName;

        const [
          actionsLast24h,
          failedLast24h,
          lastAction,
          avgResponseTime,
        ] = await Promise.all([
          // Actions dans les 24h
          prisma.agentAction.count({
            where: {
              agentName,
              createdAt: { gte: twentyFourHoursAgo },
            },
          }),

          // Erreurs dans les 24h
          prisma.agentAction.count({
            where: {
              agentName,
              status: 'FAILED',
              createdAt: { gte: twentyFourHoursAgo },
            },
          }),

          // Dernière activité
          prisma.agentAction.findFirst({
            where: { agentName },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),

          // Temps de réponse moyen (via conversations)
          prisma.conversation.aggregate({
            where: {
              agentType: agentName.toLowerCase().replace('agent', ''),
              createdAt: { gte: twentyFourHoursAgo },
            },
            _avg: { responseTimeMs: true },
          }),
        ]);

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
          avgResponseTimeMs: Math.round(avgResponseTime._avg.responseTimeMs || 0),
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
