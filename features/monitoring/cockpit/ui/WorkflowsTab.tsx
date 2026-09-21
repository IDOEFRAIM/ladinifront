'use client';

import React, { useState } from 'react';
import type { WorkflowRow, WorkflowStep } from '../workflows';
import type { ToolRow, ToolDetail } from '../tools';
import { useCockpitData } from './useCockpitData';
import { Card, DataState, DataTable, BarList, Histogram, Grid, Stat, StatusBadge, C } from './primitives';
import { fmtDuration, fmtInt, fmtMs, fmtPct, fmtAgo, fmtTime, workflowLabel } from './format';
import type { PeriodParams } from './OverviewTab';

interface WfPayload { workflows: WorkflowRow[]; steps: { workflow: string; total: number; steps: WorkflowStep[] } | null }

export function WorkflowsTab({ params }: { params: PeriodParams }) {
  const [selected, setSelected] = useState<string>('');
  const { data, loading, error, refetch } = useCockpitData<WfPayload>('/api/admin/monitoring/workflows', { ...params, workflow: selected });
  const rows = data?.workflows ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Parcours métier" subtitle="Un workflow = un but de l'agent mené dans une session. Cliquez une ligne pour voir où les utilisateurs abandonnent.">
        <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch} empty={!!data && rows.length === 0} emptyText="Aucun workflow démarré sur cette période.">
          <DataTable<WorkflowRow>
            rowKey={(r) => r.workflow}
            onRowClick={(r) => setSelected(r.workflow === selected ? '' : r.workflow)}
            columns={[
              { header: 'Workflow', render: (r) => <><b>{workflowLabel(r.workflow)}</b><div style={{ fontSize: 11, color: C.muted }}>{r.workflow}</div></> },
              { header: 'Démarrés', align: 'right', render: (r) => fmtInt(r.started) },
              { header: 'Terminés', align: 'right', render: (r) => fmtInt(r.completed) },
              { header: 'Abandons', align: 'right', render: (r) => fmtInt(r.abandoned) },
              { header: 'Erreurs', align: 'right', render: (r) => <span style={{ color: r.errors ? C.red : undefined }}>{fmtInt(r.errors)}</span> },
              { header: 'En cours', align: 'right', render: (r) => fmtInt(r.inProgress) },
              { header: 'Succès', align: 'right', render: (r) => <b>{fmtPct(r.successRate)}</b> },
              { header: 'Durée p50', align: 'right', render: (r) => fmtDuration(r.medianSeconds) },
              { header: 'Durée p95', align: 'right', render: (r) => fmtDuration(r.p95Seconds) },
            ]}
            rows={rows}
          />
        </DataState>
      </Card>
      {selected && data?.steps && (
        <Card title={`Étapes atteintes — ${workflowLabel(selected)}`} subtitle={`${fmtInt(data.steps.total)} session(s) ont démarré ce workflow`} testId="workflow-steps">
          {data.steps.steps.length === 0 ? <p style={{ fontSize: 13, color: C.muted }}>Aucune étape enregistrée pour ce workflow.</p> : (
            <BarList max={Math.max(1, data.steps.total)} items={data.steps.steps.map((s) => ({ label: s.step, value: s.reached, sub: fmtPct(s.pct) }))} />
          )}
        </Card>
      )}
    </div>
  );
}

interface ToolsPayload { tools: ToolRow[] }

export function ToolsTab({ params }: { params: PeriodParams }) {
  const [selected, setSelected] = useState('');
  const { data, loading, error, refetch } = useCockpitData<ToolsPayload>('/api/admin/monitoring/tools', params);
  const detail = useCockpitData<ToolDetail>(`/api/admin/monitoring/tools/${encodeURIComponent(selected || '_')}`, { ...params, limit: 15 }, { enabled: !!selected });
  const tools = data?.tools ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Outils MCP" subtitle="Succès = SUCCESS ou REPLAY ; erreur = ERROR ou DENIED. Cliquez un outil pour le détail.">
        <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch} empty={!!data && tools.length === 0} emptyText="Aucun appel d'outil sur cette période.">
          <DataTable<ToolRow>
            rowKey={(t) => t.toolName}
            onRowClick={(t) => setSelected(t.toolName === selected ? '' : t.toolName)}
            columns={[
              { header: 'Outil', render: (t) => <><b>{t.toolName}</b><div style={{ fontSize: 11, color: C.muted }}>{t.category === 'WRITE' ? 'écriture' : t.category === 'READ' ? 'lecture' : ''}</div></> },
              { header: 'Appels', align: 'right', render: (t) => fmtInt(t.calls) },
              { header: 'Réussis', align: 'right', render: (t) => fmtInt(t.success) },
              { header: 'Erreurs', align: 'right', render: (t) => <span style={{ color: t.errors ? C.red : undefined }}>{fmtInt(t.errors)}</span> },
              { header: 'Succès', align: 'right', render: (t) => <b>{fmtPct(t.successRate, 1)}</b> },
              { header: 'p50', align: 'right', render: (t) => fmtMs(t.p50) },
              { header: 'p95', align: 'right', render: (t) => fmtMs(t.p95) },
              { header: 'p99', align: 'right', render: (t) => fmtMs(t.p99) },
              { header: 'Dernière erreur', render: (t) => (t.lastError ? <span style={{ color: C.red }}>{t.lastError.code ?? '?'} · {fmtAgo(t.lastError.at)}</span> : '—') },
              { header: 'Dernier appel', render: (t) => fmtAgo(t.lastCallAt) },
            ]}
            rows={tools}
          />
        </DataState>
      </Card>
      {selected && (
        <Card title={`Détail — ${selected}`} testId="tool-detail" subtitle="Les arguments et résultats d'outil ne sont volontairement pas conservés (secrets, données personnelles).">
          <DataState loading={detail.loading} error={detail.error} hasData={!!detail.data} onRetry={detail.refetch}>
            {detail.data && (
              <Grid cols={3}>
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 12, color: C.muted, textTransform: 'uppercase' }}>Durées</h4>
                  <Histogram buckets={detail.data.histogram} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: 12, color: C.muted, textTransform: 'uppercase' }}>Erreurs par code</h4>
                  {detail.data.errorsByCode.length ? <BarList color={C.red} items={detail.data.errorsByCode.map((e) => ({ label: e.code, value: e.count }))} /> : <p style={{ fontSize: 13, color: C.muted }}>Aucune erreur.</p>}
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 12, color: C.muted, textTransform: 'uppercase' }}>Appels récents ({fmtInt(detail.data.total)})</h4>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                    {detail.data.recent.map((r, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                        <span style={{ color: C.muted }}>{fmtTime(r.at)} · {r.maskedPhone}</span>
                        <span><StatusBadge status={r.status === 'SUCCESS' || r.status === 'REPLAY' ? 'COMPLETED' : 'ERROR'} /> {fmtMs(r.durationMs)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Grid>
            )}
          </DataState>
        </Card>
      )}
    </div>
  );
}

export { Stat };
