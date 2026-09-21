'use client';

import React, { useState } from 'react';
import { X, ExternalLink, Wrench, User, Bot, Cpu, Database, AlertTriangle, Target } from 'lucide-react';
import type { ConversationRow, TurnDetail, TimelineEvent } from '../conversations';
import { SESSION_STATUS_LIST } from './constants';
import { useCockpitData } from './useCockpitData';
import { Card, DataState, DataTable, Select, StatusBadge, Waterfall, C, F } from './primitives';
import { STATUS_LABELS, fmtDuration, fmtAgo, fmtMs, fmtPct, fmtTime, workflowLabel, fmtXof } from './format';
import type { PeriodParams } from './OverviewTab';

interface ListPayload { data: ConversationRow[]; total: number; limit: number; offset: number }

export function ConversationsTab({ params, openId, onOpen }: { params: PeriodParams; openId: string | null; onOpen: (id: string | null) => void }) {
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [intent, setIntent] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [tool, setTool] = useState('');
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [minDuration, setMinDuration] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const { data, loading, error, refetch } = useCockpitData<ListPayload>('/api/admin/monitoring/conversations', {
    ...params, status, role, intent, workflow, tool, error: onlyErrors ? '1' : '', minDurationSeconds: minDuration, limit, offset,
  });
  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setOffset(0); };
  const input = (label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
      <input aria-label={label} value={value} onChange={(e) => reset(set)(e.target.value.trim())} placeholder={placeholder}
        style={{ padding: '7px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, width: 170, textTransform: 'none', letterSpacing: 0, fontWeight: 500 }} />
    </label>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Filtres" testId="conv-filters">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select label="Statut" value={status} onChange={reset(setStatus)} options={[{ value: '', label: 'Tous' }, ...SESSION_STATUS_LIST.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s }))]} />
          <Select label="Rôle" value={role} onChange={reset(setRole)} options={[{ value: '', label: 'Tous' }, { value: 'PRODUCER', label: 'Producteur' }, { value: 'BUYER', label: 'Acheteur' }]} />
          {input('Intent', intent, setIntent, 'ex. SALES_PUBLISH_PRODUCT')}
          {input('Workflow', workflow, setWorkflow, 'ex. BUYER_PREORDER_INIT')}
          {input('Outil', tool, setTool, 'ex. create_listing')}
          {input('Durée min (s)', minDuration, (v) => setMinDuration(v.replace(/\D/g, '')), '0')}
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: C.text }}>
            <input type="checkbox" checked={onlyErrors} onChange={(e) => { setOnlyErrors(e.target.checked); setOffset(0); }} /> Avec erreur
          </label>
        </div>
      </Card>

      <Card title={`Sessions${data ? ` (${data.total})` : ''}`} subtitle="Un clic ouvre la timeline complète de la session">
        <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch} empty={!!data && data.data.length === 0} emptyText="Aucune session ne correspond à ces filtres.">
          {data && (
            <>
              <DataTable<ConversationRow>
                rowKey={(r) => r.id}
                onRowClick={(r) => onOpen(r.id)}
                columns={[
                  { header: 'Utilisateur', render: (r) => <><b>{r.maskedPhone}</b><div style={{ fontSize: 11, color: C.muted }}>{r.role === 'PRODUCER' ? 'Producteur' : r.role === 'BUYER' ? 'Acheteur' : r.role ?? '—'}</div></> },
                  { header: 'Intent / workflow', render: (r) => <><div>{workflowLabel(r.workflow ?? r.intent)}</div><div style={{ fontSize: 11, color: C.muted }}>{r.step ? `étape : ${r.step}` : ''}</div></> },
                  { header: 'Confiance', align: 'right', render: (r) => fmtPct(r.confidence) },
                  { header: 'Dernier message', render: (r) => <span style={{ color: C.muted }}>{r.lastMessage ?? '—'}</span> },
                  { header: 'Durée', align: 'right', render: (r) => fmtDuration(r.durationSeconds) },
                  { header: 'Outils', align: 'right', render: (r) => r.toolCalls },
                  { header: 'Dernière activité', render: (r) => fmtAgo(r.lastAt) },
                  { header: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
                ]}
                rows={data.data}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12, color: C.muted }}>
                <span>{data.total === 0 ? '' : `${offset + 1}–${Math.min(offset + limit, data.total)} sur ${data.total}`}</span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} style={pagerBtn(offset === 0)}>Précédent</button>
                  <button disabled={offset + limit >= data.total} onClick={() => setOffset(offset + limit)} style={pagerBtn(offset + limit >= data.total)}>Suivant</button>
                </span>
              </div>
            </>
          )}
        </DataState>
      </Card>

      {openId && <SessionDrawer id={openId} onClose={() => onOpen(null)} />}
    </div>
  );
}

const pagerBtn = (disabled: boolean): React.CSSProperties => ({ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 100, padding: '5px 14px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, fontWeight: 600 });

interface DetailPayload { id: string; maskedPhone: string; role: string | null; turns: TurnDetail[] }

const EVENT_STYLE: Record<TimelineEvent['type'], { icon: React.ReactNode; color: string; label: string }> = {
  USER: { icon: <User size={14} />, color: C.blue, label: 'UTILISATEUR' },
  INTENT: { icon: <Target size={14} />, color: C.violet, label: 'INTENT' },
  LLM: { icon: <Cpu size={14} />, color: '#0E7490', label: 'LLM' },
  TOOL: { icon: <Wrench size={14} />, color: '#B45309', label: 'OUTIL' },
  BUSINESS: { icon: <Database size={14} />, color: '#047857', label: 'RÉSULTAT MÉTIER' },
  ERROR: { icon: <AlertTriangle size={14} />, color: C.red, label: 'ERREUR' },
  AGENT: { icon: <Bot size={14} />, color: C.forest, label: 'AGENT' },
};

function EventBody({ e }: { e: TimelineEvent }) {
  switch (e.type) {
    case 'USER': return <>{e.text ?? <i style={{ color: C.muted }}>(contenu non conservé)</i>}</>;
    case 'INTENT': return <>{workflowLabel(e.intent)} · confiance {fmtPct(e.confidence)}{e.workflow ? <> · workflow <b>{workflowLabel(e.workflow)}</b></> : null}{e.step ? <> · étape {e.step}</> : null}</>;
    case 'LLM': return <>{e.kind === 'INTERPRETER' ? 'interprétation' : e.kind === 'RESPONSE' ? 'réponse' : 'autre'} · {e.provider ?? '?'}/{e.model ?? '?'} · {fmtMs(e.durationMs)} · {e.status}{e.fallback ? ' · repli' : ''}</>;
    case 'TOOL': return <><b>{e.name}</b> · {fmtMs(e.durationMs)} · <span style={{ color: e.status === 'SUCCESS' || e.status === 'REPLAY' ? '#047857' : C.red, fontWeight: 700 }}>{e.status}</span>{e.errorCode ? ` (${e.errorCode})` : ''}{e.mutation ? ' · écriture en base' : ''}</>;
    case 'BUSINESS': return <>{e.kind === 'PRODUCT' ? 'Offre publiée' : e.kind === 'ORDER' ? 'Commande créée' : e.kind === 'AUCTION' ? "Appel d'offres créé" : 'Offre (bid) déposée'} · {e.amount !== null ? fmtXof(e.amount) : ''} <span style={{ color: C.muted }}>#{e.ref.slice(0, 8)}</span></>;
    case 'ERROR': return <>{e.code} {e.category ? `(${e.category})` : ''}</>;
    case 'AGENT': return <>{e.text ?? <i style={{ color: C.muted }}>(contenu non conservé)</i>} <span style={{ color: C.muted }}>· envoi {e.status}{e.durationMs !== null ? ` en ${fmtMs(e.durationMs)}` : ''}</span></>;
  }
}

function SessionDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, loading, error, refetch } = useCockpitData<DetailPayload>(`/api/admin/monitoring/conversations/${id}`, {});
  return (
    <aside role="dialog" aria-label="Détail de la session" data-testid="session-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(680px, 100vw)', background: '#fff', boxShadow: '-12px 0 40px rgba(6,78,59,0.18)', zIndex: 60, overflowY: 'auto', padding: 22 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: F.heading, fontSize: 18, color: C.forest }}>Session {data?.maskedPhone ?? ''}</h2>
          {data && <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>{data.turns.length} tour(s) · {data.role ?? 'rôle inconnu'}</p>}
        </div>
        <button onClick={onClose} aria-label="Fermer" style={{ border: 'none', background: 'rgba(6,78,59,0.06)', borderRadius: 100, width: 32, height: 32, cursor: 'pointer' }}><X size={16} /></button>
      </header>
      <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
        {data?.turns.map((t, i) => (
          <div key={t.id} data-testid="turn" style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px dashed ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 8 }}>
              <span>Tour {i + 1} · {fmtTime(t.startedAt)} · {fmtMs(t.durationMs)} · {t.outcome}</span>
              {t.traceUrl && <a href={t.traceUrl} target="_blank" rel="noreferrer noopener" style={{ color: C.forest, fontWeight: 700, display: 'inline-flex', gap: 4, alignItems: 'center' }}>Trace <ExternalLink size={12} /></a>}
            </div>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {t.events.map((e, k) => {
                const st = EVENT_STYLE[e.type];
                return (
                  <li key={k} style={{ display: 'grid', gridTemplateColumns: '58px 26px 1fr', gap: 8, fontSize: 13, alignItems: 'start' }}>
                    <span style={{ color: C.muted, fontSize: 11, paddingTop: 2 }}>{fmtTime(e.at)}</span>
                    <span style={{ color: st.color, paddingTop: 2 }} title={st.label}>{st.icon}</span>
                    <span><b style={{ color: st.color, fontSize: 10, letterSpacing: '0.06em' }}>{st.label}</b><br /><EventBody e={e} /></span>
                  </li>
                );
              })}
            </ol>
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: C.forest, fontWeight: 700 }}>Où est parti le temps ?</summary>
              <Waterfall total={t.durationMs} rows={[
                { label: 'File Celery', ms: t.breakdown.queue, color: '#94A3B8' }, { label: 'Redis', ms: t.breakdown.redis, color: '#DC2626', note: 'cumul des commandes Redis du tour' },
                { label: 'Base de données', ms: t.breakdown.db, color: '#7C3AED', note: 'cumul SQL du tour' }, { label: 'LLM interprétation', ms: t.breakdown.intentLlm, color: '#0E7490' },
                { label: 'MCP (outils)', ms: t.breakdown.mcp, color: '#B45309' }, { label: 'LLM réponse', ms: t.breakdown.responseLlm, color: '#0891B2' },
                { label: 'WhatsApp / Twilio', ms: t.breakdown.whatsapp, color: '#047857' }, { label: 'Autre', ms: t.breakdown.other, color: '#64748B' },
              ]} />
            </details>
          </div>
        ))}
      </DataState>
    </aside>
  );
}
