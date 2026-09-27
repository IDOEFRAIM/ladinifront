'use client';

import React from 'react';
import type { PerformanceData } from '../performance';
import { useCockpitData } from './useCockpitData';
import { Card, DataState, DataTable, Grid, Histogram, Stat, TimeSeries, Waterfall, C } from './primitives';
import { fmtInt, fmtMs, fmtPct, workflowLabel } from './format';
import type { PeriodParams } from './OverviewTab';

export function PerformanceTab({ params, onOpenConversation }: { params: PeriodParams; onOpenConversation: (id: string) => void }) {
  const { data, loading, error, refetch } = useCockpitData<PerformanceData>('/api/admin/monitoring/performance', params);
  return (
    <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch} empty={!!data && data.turns === 0} emptyText="Aucun tour mesuré sur cette période.">
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Latence d'un tour" subtitle={`${fmtInt(data.turns)} tours · période courante vs période précédente`} testId="perf-percentiles">
            <Grid cols={4}>
              <Stat label="p50" value={fmtMs(data.current.p50)} delta={{ current: data.current.p50, previous: data.previous.p50 }} invertDelta />
              <Stat label="p95" value={fmtMs(data.current.p95)} delta={{ current: data.current.p95, previous: data.previous.p95 }} invertDelta />
              <Stat label="p99" value={fmtMs(data.current.p99)} delta={{ current: data.current.p99, previous: data.previous.p99 }} invertDelta />
            </Grid>
            <div style={{ marginTop: 14 }}>
              <TimeSeries points={data.series.map((s) => ({ bucket: s.bucket, p50: s.p50, p95: s.p95 }))} series={[{ key: 'p50', label: 'p50 (ms)', color: C.emerald }, { key: 'p95', label: 'p95 (ms)', color: C.amber }]} />
            </div>
          </Card>

          <Card title="Fenêtres fixes" subtitle="Indépendantes de la période choisie">
            <DataTable rowKey={(w) => w.window} rows={data.windows}
              columns={[
                { header: 'Fenêtre', render: (w) => <b>{w.window}</b> }, { header: 'Tours', align: 'right', render: (w) => fmtInt(w.turns) },
                { header: 'p50', align: 'right', render: (w) => fmtMs(w.p50) }, { header: 'p95', align: 'right', render: (w) => fmtMs(w.p95) }, { header: 'p99', align: 'right', render: (w) => fmtMs(w.p99) },
              ]} />
          </Card>

          <Grid cols={2}>
            <Card title="Où part le temps d'un tour ?" subtitle="Tour moyen de la période">
              <Waterfall total={data.waterfall.total} rows={[
                { label: 'File Celery', ms: data.waterfall.queue, color: '#94A3B8' }, { label: 'Redis', ms: data.waterfall.redis, color: '#DC2626' },
                { label: 'Base de données', ms: data.waterfall.db, color: '#7C3AED' }, { label: 'LLM interprétation', ms: data.waterfall.intentLlm, color: '#0E7490' },
                { label: 'MCP (outils)', ms: data.waterfall.mcp, color: '#B45309' }, { label: 'LLM réponse', ms: data.waterfall.responseLlm, color: '#0891B2' },
                { label: 'WhatsApp / Twilio', ms: data.waterfall.whatsapp, color: '#047857' }, { label: 'Autre', ms: data.waterfall.other, color: '#64748B' },
              ]} />
            </Card>
            <Card title="Distribution des durées">
              <Histogram buckets={data.histogram} />
            </Card>
          </Grid>

          <Card title="Percentiles par poste" subtitle="p50 / p95 / p99 de chaque composante d'un tour">
            <DataTable rowKey={(c) => c.key} rows={data.components}
              columns={[{ header: 'Poste', render: (c) => <b>{c.label}</b> }, { header: 'p50', align: 'right', render: (c) => fmtMs(c.p50) }, { header: 'p95', align: 'right', render: (c) => fmtMs(c.p95) }, { header: 'p99', align: 'right', render: (c) => fmtMs(c.p99) }]} />
          </Card>

          <Card title="Providers LLM" subtitle="Quel provider est lent ou en repli ?" testId="perf-llm">
            <DataTable rowKey={(l) => l.provider} empty="Aucun appel LLM enregistré." rows={data.llmByProvider}
              columns={[
                { header: 'Provider', render: (l) => <><b>{l.provider}</b><div style={{ fontSize: 11, color: C.muted }}>{l.model ?? ''}</div></> },
                { header: 'Appels', align: 'right', render: (l) => fmtInt(l.calls) }, { header: 'Erreurs', align: 'right', render: (l) => <span style={{ color: (l.errorRate ?? 0) > 0.05 ? C.red : undefined }}>{fmtPct(l.errorRate, 1)}</span> },
                { header: 'Replis', align: 'right', render: (l) => fmtInt(l.fallbacks) }, { header: 'p50', align: 'right', render: (l) => fmtMs(l.p50) }, { header: 'p95', align: 'right', render: (l) => fmtMs(l.p95) },
              ]} />
          </Card>

          <Card title="Tours les plus lents" subtitle="Poste dominant = composante la plus longue du tour">
            <DataTable rowKey={(s) => s.id} onRowClick={(s) => onOpenConversation(s.conversationId)} empty="Aucun tour." rows={data.slowest}
              columns={[
                { header: 'Durée', align: 'right', render: (s) => <b>{fmtMs(s.durationMs)}</b> }, { header: 'Intent', render: (s) => workflowLabel(s.intent) },
                { header: 'Issue', render: (s) => s.outcome }, { header: 'Poste dominant', render: (s) => s.dominant }, { header: 'Quand', render: (s) => new Date(s.at).toLocaleString('fr-FR') },
              ]} />
          </Card>
        </div>
      )}
    </DataState>
  );
}
