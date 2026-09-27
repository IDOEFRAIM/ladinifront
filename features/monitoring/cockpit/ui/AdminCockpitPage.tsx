'use client';

import React, { useState } from 'react';
import { Bot, Radio } from 'lucide-react';
import { TABS, type TabId } from './constants';
import { C, F } from './primitives';
import { OverviewTab, type PeriodParams } from './OverviewTab';
import { ConversationsTab } from './ConversationsTab';
import { WorkflowsTab, ToolsTab } from './WorkflowsTab';
import { PerformanceTab } from './PerformanceTab';
import { BusinessTab, HealthTab } from './BusinessHealthTabs';
import { DiagnosticsBanner } from './DiagnosticsBanner';

const PERIODS = [{ v: '1h', l: '1 h' }, { v: '24h', l: '24 h' }, { v: '7d', l: '7 j' }, { v: '30d', l: '30 j' }, { v: 'custom', l: 'Personnalisée' }] as const;
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

/** Cockpit opérationnel de l'agent : technique + produit + business, avec sélecteur de période global. */
export default function AdminCockpitPage() {
  const [tab, setTab] = useState<TabId>('overview');
  const [period, setPeriod] = useState<string>('24h');
  const [from, setFrom] = useState(() => toLocalInput(new Date(Date.now() - 24 * 3600_000)));
  const [to, setTo] = useState(() => toLocalInput(new Date()));
  const [live, setLive] = useState(false);
  const [openConversation, setOpenConversation] = useState<string | null>(null);

  const params: PeriodParams = period === 'custom' ? { period, from: new Date(from).toISOString(), to: new Date(to).toISOString() } : { period };
  const open = (id: string | null) => { setOpenConversation(id); if (id) setTab('conversations'); };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 16px', fontFamily: F.body }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: F.heading, fontSize: 24, fontWeight: 800, color: C.forest, display: 'flex', alignItems: 'center', gap: 10 }}><Bot size={24} /> Cockpit de l&apos;agent</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>Le système fonctionne-t-il ? L&apos;agent réussit-il ? Cela produit-il de la valeur ?</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }} data-testid="period-selector">
          <div role="group" aria-label="Période" style={{ display: 'flex', background: 'rgba(6,78,59,0.05)', borderRadius: 100, padding: 3 }}>
            {PERIODS.map((p) => (
              <button key={p.v} aria-pressed={period === p.v} onClick={() => setPeriod(p.v)}
                style={{ border: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: period === p.v ? '#fff' : 'transparent', color: period === p.v ? C.forest : C.muted, boxShadow: period === p.v ? '0 1px 6px rgba(6,78,59,0.1)' : 'none' }}>{p.l}</button>
            ))}
          </div>
          {period === 'custom' && (
            <>
              <input type="datetime-local" aria-label="Début" value={from} onChange={(e) => setFrom(e.target.value)} style={dateStyle} />
              <input type="datetime-local" aria-label="Fin" value={to} onChange={(e) => setTo(e.target.value)} style={dateStyle} />
            </>
          )}
        </div>
      </header>

      <DiagnosticsBanner />

      <nav role="tablist" aria-label="Sections du cockpit" style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '10px 16px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: tab === t.id ? C.forest : C.muted, borderBottom: `3px solid ${tab === t.id ? C.emerald : 'transparent'}` }}>{t.label}</button>
        ))}
        {tab === 'overview' && (
          <button onClick={() => setLive((v) => !v)} aria-pressed={live} data-testid="live-toggle"
            style={{ marginLeft: 'auto', border: 'none', background: live ? 'rgba(16,185,129,0.14)' : 'transparent', color: live ? '#047857' : C.muted, borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center', alignSelf: 'center' }}>
            <Radio size={14} /> Temps réel {live ? 'activé' : 'désactivé'}
          </button>
        )}
      </nav>

      <main role="tabpanel">
        {tab === 'overview' && <OverviewTab params={params} live={live} onOpenConversation={open} onGoto={(t) => setTab(t as TabId)} />}
        {tab === 'conversations' && <ConversationsTab params={params} openId={openConversation} onOpen={setOpenConversation} />}
        {tab === 'workflows' && <WorkflowsTab params={params} />}
        {tab === 'tools' && <ToolsTab params={params} />}
        {tab === 'performance' && <PerformanceTab params={params} onOpenConversation={open} />}
        {tab === 'business' && <BusinessTab params={params} />}
        {tab === 'health' && <HealthTab />}
      </main>
    </div>
  );
}

const dateStyle: React.CSSProperties = { padding: '6px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 };
