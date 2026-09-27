'use client';

import React from 'react';
import type { OverviewData } from '../overview';
import type { HealthState } from '../thresholds';
import { useCockpitData } from './useCockpitData';
import { Card, DataState, Funnel, Grid, BarList, Stat, StateBadge, TimeSeries, C } from './primitives';
import { fmtInt, fmtMs, fmtPct, workflowLabel } from './format';
import { LiveFeed } from './LiveFeed';

export type PeriodParams = { period: string; from?: string; to?: string };
type OverviewPayload = OverviewData & { health: { overall: HealthState; dependencies: { key: string; label: string; state: HealthState }[] } };

export function OverviewTab({ params, live, onOpenConversation, onGoto }: { params: PeriodParams; live: boolean; onOpenConversation: (id: string) => void; onGoto: (tab: string) => void }) {
  const { data, loading, error, refetch } = useCockpitData<OverviewPayload>('/api/admin/monitoring/overview', params, { refreshMs: live ? 15000 : undefined });
  const empty = !!data && data.activity.messagesReceived === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {live && <LiveFeed onOpenConversation={onOpenConversation} />}
      <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch} empty={empty} emptyText="Aucun message traité sur cette période. Les tours apparaissent ici dès que l'agent répond.">
        {data && (
          <>
            <Card title="Santé" subtitle="État agrégé des dépendances (détail dans l'onglet Santé)" right={<StateBadge state={data.health.overall} />} testId="overview-health">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {data.health.dependencies.map((d) => (
                  <button key={d.key} onClick={() => onGoto('health')} style={{ display: 'flex', gap: 8, alignItems: 'center', border: `1px solid ${C.border}`, background: '#fff', borderRadius: 100, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                    {d.label} <StateBadge state={d.state} />
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Parcours de bout en bout" subtitle="Chaque étape ⊂ la précédente : message → intention comprise → workflow → outil OK → action métier réussie → réponse envoyée">
              <Funnel stages={data.funnel} />
            </Card>

            <Grid cols={3}>
              <Card title="Activité" testId="kpi-activity">
                <Grid cols={4} gap={12}>
                  <Stat label="Utilisateurs 24 h" value={fmtInt(data.activity.activeUsers24h)} />
                  <Stat label="Utilisateurs 7 j" value={fmtInt(data.activity.activeUsers7d)} />
                  <Stat label="Conversations" value={fmtInt(data.activity.conversations)} />
                  <Stat label="Messages reçus" value={fmtInt(data.activity.messagesReceived)} />
                  <Stat label="Messages envoyés" value={fmtInt(data.activity.messagesSent)} />
                  <Stat label="Nouveaux inscrits" value={fmtInt(data.activity.newUsers)} />
                </Grid>
              </Card>
              <Card title="Compréhension" testId="kpi-understanding">
                <Grid cols={4} gap={12}>
                  <Stat label="Intentions reconnues" value={fmtPct(data.understanding.recognizedRate)} hint={`${fmtInt(data.understanding.recognizedTurns)} tours`} />
                  <Stat label="Confiance moyenne" value={fmtPct(data.understanding.avgConfidence)} />
                  <Stat label="Clarifications" value={fmtPct(data.understanding.clarificationRate, 1)} />
                  <Stat label="Erreurs / repli" value={fmtPct(data.understanding.fallbackRate, 1)} />
                </Grid>
              </Card>
              <Card title="Exécution de l'agent" testId="kpi-execution">
                <Grid cols={4} gap={12}>
                  <Stat label="Appels d'outils" value={fmtInt(data.execution.toolCalls)} hint={`${fmtInt(data.execution.toolSuccess)} réussis · ${fmtInt(data.execution.toolErrors)} en échec`} />
                  <Stat label="Workflows démarrés" value={fmtInt(data.execution.workflowsStarted)} />
                  <Stat label="Terminés" value={fmtInt(data.execution.workflowsCompleted)} />
                  <Stat label="Abandonnés" value={fmtInt(data.execution.workflowsAbandoned)} />
                </Grid>
              </Card>
              <Card title="Performance d'un tour" testId="kpi-performance">
                <Grid cols={4} gap={12}>
                  <Stat label="p50" value={fmtMs(data.performance.p50)} delta={{ current: data.performance.p50, previous: data.performance.previous.p50 }} invertDelta />
                  <Stat label="p95" value={fmtMs(data.performance.p95)} delta={{ current: data.performance.p95, previous: data.performance.previous.p95 }} invertDelta />
                  <Stat label="p99" value={fmtMs(data.performance.p99)} delta={{ current: data.performance.p99, previous: data.performance.previous.p99 }} invertDelta />
                </Grid>
                <button onClick={() => onGoto('performance')} style={{ marginTop: 10, border: 'none', background: 'none', color: C.forest, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>Où part le temps ? →</button>
              </Card>
              <Card title="Business (période)" testId="kpi-business">
                <Grid cols={4} gap={12}>
                  <Stat label="Publications" value={fmtInt(data.business.publications)} />
                  <Stat label="Précommandes" value={fmtInt(data.business.preorders)} />
                  <Stat label="Commandes" value={fmtInt(data.business.orders)} />
                  <Stat label="Enchères" value={fmtInt(data.business.auctions)} />
                  <Stat label="Bids" value={fmtInt(data.business.bids)} />
                  <Stat label="Paiements" value={fmtInt(data.business.payments)} />
                  <Stat label="Livraisons" value={fmtInt(data.business.deliveries)} />
                </Grid>
                <button onClick={() => onGoto('business')} style={{ marginTop: 10, border: 'none', background: 'none', color: C.forest, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>GMV et détail →</button>
              </Card>
            </Grid>

            <Card title="Trafic et erreurs dans le temps" subtitle="Tours par intervalle, et tours en erreur">
              <TimeSeries points={data.series.map((s) => ({ bucket: s.bucket, turns: s.turns, errors: s.errors }))} series={[{ key: 'turns', label: 'Tours', color: C.emerald }, { key: 'errors', label: 'Erreurs', color: C.red }]} />
            </Card>

            <Grid cols={2}>
              <Card title="Ce que demandent les utilisateurs" subtitle="Intentions les plus fréquentes">
                <BarList items={data.understanding.topIntents.map((i) => ({ label: workflowLabel(i.intent), value: i.count, sub: i.avgConfidence === null ? undefined : `conf. ${fmtPct(i.avgConfidence)}` }))} />
              </Card>
              <Card title="Mal compris" subtitle="Intentions inconnues ou tours terminés en clarification">
                {data.understanding.notUnderstood.length ? <BarList color={C.amber} items={data.understanding.notUnderstood.map((i) => ({ label: workflowLabel(i.intent), value: i.count }))} /> : <p style={{ fontSize: 13, color: C.muted }}>Aucune intention mal comprise sur la période.</p>}
              </Card>
            </Grid>
          </>
        )}
      </DataState>
    </div>
  );
}
