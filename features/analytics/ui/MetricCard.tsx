'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { C, F } from '@/features/monitoring/cockpit/ui/primitives';
import { DASH, TARGET_LABELS, fmtDelta, fmtQuantity, fmtRatioPct, fmtValue } from '../format';
import type { BreakdownItem, DataStatus, MetricPayload, Reliability, TargetInfo, TargetStatus } from '../types';

const RELIABILITY_STYLE: Record<Reliability, { fg: string; bg: string; label: string }> = {
  RELIABLE: { fg: '#047857', bg: 'rgba(16,185,129,0.12)', label: 'Fiable' },
  PARTIAL: { fg: '#B45309', bg: 'rgba(217,119,6,0.14)', label: 'PARTIAL' },
  UNAVAILABLE: { fg: '#475569', bg: 'rgba(100,116,139,0.14)', label: 'Indisponible' },
};

const TARGET_STYLE: Record<TargetStatus, { fg: string; bg: string }> = {
  ON_TARGET: { fg: '#047857', bg: 'rgba(16,185,129,0.12)' },
  BELOW_TARGET: { fg: '#92400E', bg: 'rgba(245,158,11,0.14)' },
  WARNING: { fg: '#B45309', bg: 'rgba(217,119,6,0.18)' },
  CRITICAL: { fg: '#B91C1C', bg: 'rgba(220,38,38,0.14)' },
  NO_TARGET: { fg: C.muted, bg: 'transparent' },
};

export function ReliabilityBadge({ reliability, title }: { reliability: Reliability; title?: string }) {
  const s = RELIABILITY_STYLE[reliability];
  return (
    <span data-testid={`reliability-${reliability}`} title={title} style={{ background: s.bg, color: s.fg, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

/** Plusieurs unités incompatibles : une ligne PAR unité, jamais un total unique sans unité. */
export function MixedUnits({ items }: { items: BreakdownItem[] }) {
  return (
    <ul data-testid="mixed-units" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((b) => (
        <li key={b.canonical_unit ?? b.journey} style={{ fontFamily: F.heading, fontSize: 16, fontWeight: 800, color: C.forest, lineHeight: 1.25 }}>
          {b.denominator !== null && b.denominator !== undefined ? (
            <>{fmtRatioPct(b.value, 1)} <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{b.canonical_unit}</span></>
          ) : (
            fmtQuantity(b.numerator, b.canonical_unit)
          )}
        </li>
      ))}
    </ul>
  );
}

export interface MetricCardProps {
  label: string;
  value: number | null;
  unit: string | null;
  status?: DataStatus;
  previousValue?: number | null;
  delta?: string | null;
  target?: TargetInfo | null;
  targetStatus?: TargetStatus;
  reliabilityStatus: Reliability;
  notes?: string[];
  breakdown?: BreakdownItem[];
  hint?: string;
  testId?: string;
}

/** Carte KPI standard : valeur, fiabilité, comparaison, objectif. Gère fiable / PARTIAL / indisponible / sans donnée / unités mixtes. */
export function MetricCard(p: MetricCardProps) {
  const [open, setOpen] = useState(false);
  const status = p.status ?? 'OK';
  const unavailable = status === 'UNAVAILABLE';
  const noData = status === 'NO_DATA';
  const mixed = status === 'MIXED_UNITS';
  const target = p.target ?? null;
  const targetStatus = p.targetStatus ?? 'NO_TARGET';
  const hasDetails = (p.notes?.length ?? 0) > 0 || p.reliabilityStatus === 'PARTIAL';

  const main = unavailable || noData ? (
    <div data-testid="metric-value" style={{ fontFamily: F.heading, fontSize: 26, fontWeight: 800, color: C.muted, lineHeight: 1.2 }}>{DASH}</div>
  ) : mixed ? (
    <MixedUnits items={p.breakdown ?? []} />
  ) : (
    <div data-testid="metric-value" style={{ fontFamily: F.heading, fontSize: 26, fontWeight: 800, color: C.forest, lineHeight: 1.2 }}>{fmtValue(p.value, p.unit)}</div>
  );

  return (
    <article data-testid={p.testId ?? `metric-${p.label}`} data-status={status} style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.muted }}>{p.label}</span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          {p.reliabilityStatus !== 'RELIABLE' && <ReliabilityBadge reliability={p.reliabilityStatus} title={p.notes?.[0]} />}
          {hasDetails && (
            <button type="button" aria-label={`Détails de la métrique ${p.label}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.muted, padding: 0, display: 'inline-flex' }}><Info size={14} /></button>
          )}
        </span>
      </header>

      {main}

      {unavailable && <div data-testid="metric-unavailable" style={{ fontSize: 12, color: C.muted }}>Donnée indisponible</div>}
      {noData && <div data-testid="metric-nodata" style={{ fontSize: 12, color: C.muted }}>Aucune donnée sur la période</div>}
      {mixed && <div style={{ fontSize: 11, color: C.muted }}>Unités mixtes : aucun total unique</div>}

      {!unavailable && !noData && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, color: C.muted, minHeight: 16 }}>
          {p.hint && <span>{p.hint}</span>}
          {p.delta && <span data-testid="metric-delta" title="vs période précédente" style={{ fontWeight: 700, color: C.text }}>{p.delta}</span>}
          {p.previousValue !== null && p.previousValue !== undefined && !mixed && <span data-testid="metric-previous">préc. {fmtValue(p.previousValue, p.unit)}</span>}
        </div>
      )}

      {!unavailable && (
        target === null ? (
          <div data-testid="target-none" style={{ fontSize: 11, color: C.muted }}>{TARGET_LABELS.NO_TARGET}</div>
        ) : (
          <div data-testid="target-line" style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Objectif {fmtValue(target.value, p.unit)}</span>
            {p.value !== null && p.unit === 'ratio' && <span>· écart {fmtDelta({ delta: p.value - target.value, delta_kind: 'percentage_points', delta_pct: null })}</span>}
            <span data-testid={`target-${targetStatus}`} style={{ background: TARGET_STYLE[targetStatus].bg, color: TARGET_STYLE[targetStatus].fg, fontWeight: 800, padding: '1px 8px', borderRadius: 100 }}>{TARGET_LABELS[targetStatus]}</span>
          </div>
        )
      )}

      {open && (
        <div data-testid="metric-details" role="note" style={{ marginTop: 4, fontSize: 11, color: C.text, background: 'rgba(6,78,59,0.04)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {p.notes?.map((n) => <p key={n} style={{ margin: 0 }}>{n}</p>)}
          {p.breakdown && !mixed && p.breakdown.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {p.breakdown.map((b) => (
                <li key={b.journey ?? b.canonical_unit}>{b.journey ?? b.canonical_unit} : {fmtRatioPct(b.value, 1)} ({b.numerator ?? DASH}/{b.denominator ?? DASH}){b.reliability ? ` · ${b.reliability}` : ''}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

/** Carte alimentée directement par un résultat de l'API (aucun calcul). */
export function MetricCardFromPayload({ metric, label, hint }: { metric: MetricPayload; label?: string; hint?: string }) {
  return (
    <MetricCard
      testId={`metric-${metric.metric_name}`}
      label={label ?? metric.label ?? metric.metric_name}
      value={metric.value}
      unit={metric.unit}
      status={metric.status}
      previousValue={metric.previous_value}
      delta={fmtDelta(metric)}
      target={metric.target}
      targetStatus={metric.target_status}
      reliabilityStatus={metric.reliability}
      notes={metric.notes}
      breakdown={metric.breakdown}
      hint={hint}
    />
  );
}
