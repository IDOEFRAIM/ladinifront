'use client';

import React from 'react';
import { AlertTriangle, Loader2, Inbox, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { STATE_COLORS, STATUS_COLORS, STATUS_LABELS, fmtInt, fmtPct, fmtMs, delta } from './format';
import type { HealthState } from '../thresholds';

export const C = { forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#DC2626', blue: '#1D4ED8', violet: '#7C3AED', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.78)', border: 'rgba(6,78,59,0.09)', muted: '#64748B', text: '#1F2937' };
export const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

export function Card({ title, subtitle, right, children, style, testId }: { title?: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties; testId?: string }) {
  return (
    <section data-testid={testId} style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20, ...style }}>
      {(title || right) && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div>
            {title && <h3 style={{ margin: 0, fontFamily: F.heading, fontSize: 15, fontWeight: 700, color: C.forest }}>{title}</h3>}
            {subtitle && <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, delta: d, invertDelta, testId }: { label: string; value: string; hint?: string; delta?: { current: number | null; previous: number | null }; invertDelta?: boolean; testId?: string }) {
  const dl = d ? delta(d.current, d.previous) : null;
  // invertDelta : une hausse est MAUVAISE (latence, erreurs)
  const good = dl?.direction && dl.direction !== 'flat' ? (invertDelta ? dl.direction === 'down' : dl.direction === 'up') : null;
  return (
    <div data-testid={testId} style={{ minWidth: 120 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted }}>{label}</div>
      <div style={{ fontFamily: F.heading, fontSize: 24, fontWeight: 800, color: C.forest, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 6, alignItems: 'center', minHeight: 16 }}>
        {hint}
        {dl?.pct !== null && dl?.pct !== undefined && (
          <span title="vs période précédente" style={{ display: 'inline-flex', alignItems: 'center', color: dl.direction === 'flat' ? C.muted : good ? '#047857' : C.red, fontWeight: 700 }}>
            {dl.direction === 'up' ? <ArrowUpRight size={12} /> : dl.direction === 'down' ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {fmtPct(Math.abs(dl.pct))}
          </span>
        )}
      </div>
    </div>
  );
}

export function StateBadge({ state }: { state: HealthState }) {
  const c = STATE_COLORS[state];
  return <span data-testid={`state-${state}`} style={{ background: c.bg, color: c.fg, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 100, letterSpacing: '0.04em' }}>{c.label}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? C.muted;
  return <span style={{ background: `${color}1A`, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>{STATUS_LABELS[status] ?? status}</span>;
}

/** Enveloppe d'affichage : chargement, erreur (avec réessai), état vide, ou contenu. */
export function DataState({ loading, error, empty, emptyText = 'Aucune donnée sur cette période.', hasData, onRetry, children }: { loading: boolean; error: string | null; empty?: boolean; emptyText?: string; hasData: boolean; onRetry?: () => void; children: React.ReactNode }) {
  if (error && !hasData) {
    return (
      <div role="alert" data-testid="state-error" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 20, borderRadius: 16, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)', color: '#991B1B', fontSize: 13 }}>
        <AlertTriangle size={18} /> <span style={{ flex: 1 }}>{error}</span>
        {onRetry && <button onClick={onRetry} style={{ border: 'none', background: C.forest, color: '#fff', borderRadius: 100, padding: '6px 14px', fontWeight: 700, cursor: 'pointer' }}>Réessayer</button>}
      </div>
    );
  }
  if (loading && !hasData) {
    return <div data-testid="state-loading" style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 40, color: C.muted, fontSize: 13 }}><Loader2 size={16} className="animate-spin" /> Chargement…</div>;
  }
  if (empty) {
    return <div data-testid="state-empty" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', padding: 40, color: C.muted, fontSize: 13 }}><Inbox size={22} />{emptyText}</div>;
  }
  return (
    <>
      {error && <div role="alert" style={{ fontSize: 12, color: '#991B1B', marginBottom: 8 }}>Données possiblement périmées : {error}</div>}
      {children}
    </>
  );
}

/** Funnel horizontal : nombre, % du total, % de l'étage précédent et perte. */
export function Funnel({ stages }: { stages: { key: string; label: string; count: number; pctOfTotal: number | null; pctOfPrevious: number | null; lost: number }[] }) {
  const max = Math.max(1, stages[0]?.count ?? 1);
  return (
    <ol data-testid="funnel" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {stages.map((s, i) => (
        <li key={s.key} data-testid={`funnel-${s.key}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ fontWeight: 600, color: C.text }}>{s.label}</span>
            <span style={{ color: C.muted }}>
              <b style={{ color: C.forest }}>{fmtInt(s.count)}</b>
              {i > 0 && <> · {fmtPct(s.pctOfPrevious)} de l&apos;étape précédente{s.lost > 0 && <span style={{ color: C.red }}> · −{fmtInt(s.lost)}</span>}</>}
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 100, background: 'rgba(6,78,59,0.07)', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(1, (s.count / max) * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${C.emerald}, ${C.forest})`, opacity: 1 - i * 0.08 }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Liste de barres horizontales (libellé, valeur, barre proportionnelle). */
export function BarList({ items, format = fmtInt, color = C.emerald, max }: { items: { label: string; value: number; sub?: string }[]; format?: (n: number) => string; color?: string; max?: number }) {
  const m = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it) => (
        <li key={it.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{it.label}{it.sub && <span style={{ color: C.muted }}> · {it.sub}</span>}</span>
            <b style={{ color: C.forest }}>{format(it.value)}</b>
          </div>
          <div style={{ height: 6, borderRadius: 100, background: 'rgba(6,78,59,0.07)' }}><div style={{ width: `${Math.max(2, (it.value / m) * 100)}%`, height: '100%', borderRadius: 100, background: color }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Barres verticales (histogramme). */
export function Histogram({ buckets, color = C.emerald }: { buckets: { label: string; count: number }[]; color?: string }) {
  const m = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div data-testid="histogram" style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
      {buckets.map((b) => (
        <div key={b.label} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: C.muted }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.forest }}>{fmtInt(b.count)}</div>
          <div style={{ height: `${(b.count / m) * 80}px`, minHeight: 2, background: color, borderRadius: '6px 6px 0 0', margin: '2px 0' }} />
          {b.label}
        </div>
      ))}
    </div>
  );
}

/** Courbes temporelles SVG (jusqu'à 2 séries). */
export function TimeSeries({ points, series, height = 110 }: { points: { bucket: string; [k: string]: number | string | null }[]; series: { key: string; label: string; color: string }[]; height?: number }) {
  const W = 600;
  const vals = points.flatMap((p) => series.map((s) => (typeof p[s.key] === 'number' ? (p[s.key] as number) : 0)));
  const max = Math.max(1, ...vals);
  const x = (i: number) => (points.length <= 1 ? W / 2 : (i / (points.length - 1)) * (W - 8) + 4);
  const y = (v: number) => height - 6 - (v / max) * (height - 16);
  return (
    <div data-testid="timeseries">
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" aria-label="évolution dans le temps">
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={height - 6 - f * (height - 16)} y2={height - 6 - f * (height - 16)} stroke="rgba(6,78,59,0.07)" />)}
        {series.map((s) => (
          <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round"
            points={points.map((p, i) => `${x(i)},${y(typeof p[s.key] === 'number' ? (p[s.key] as number) : 0)}`).join(' ')} />
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.muted }}>
        {series.map((s) => <span key={s.key}><i style={{ display: 'inline-block', width: 10, height: 3, background: s.color, marginRight: 4, verticalAlign: 'middle' }} />{s.label}</span>)}
        <span style={{ marginLeft: 'auto' }}>max {fmtInt(max)}</span>
      </div>
    </div>
  );
}

/** Waterfall d'un tour : chaque poste comme barre proportionnelle à la durée totale (les postes peuvent se chevaucher). */
export function Waterfall({ total, rows }: { total: number; rows: { label: string; ms: number | null; note?: string; color?: string }[] }) {
  const t = Math.max(1, total);
  return (
    <div data-testid="waterfall" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: C.forest }}><span>Total</span><span>{fmtMs(total)}</span></div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 74px', gap: 10, alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: C.text }} title={r.note}>{r.label}</span>
          <div style={{ height: 10, borderRadius: 100, background: 'rgba(6,78,59,0.07)' }}><div style={{ width: `${r.ms === null ? 0 : Math.min(100, Math.max(1, (r.ms / t) * 100))}%`, height: '100%', borderRadius: 100, background: r.color ?? C.emerald }} /></div>
          <span style={{ textAlign: 'right', color: C.forest, fontWeight: 700 }}>{fmtMs(r.ms)}</span>
        </div>
      ))}
      <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted }}>Les postes se mesurent indépendamment et peuvent se chevaucher (SQL et Redis s&apos;exécutent à l&apos;intérieur des outils et des LLM).</p>
    </div>
  );
}

export function DataTable<T>({ columns, rows, onRowClick, empty, rowKey }: { columns: { header: string; render: (r: T) => React.ReactNode; align?: 'left' | 'right'; width?: number | string }[]; rows: T[]; onRowClick?: (r: T) => void; empty?: string; rowKey: (r: T) => string }) {
  if (!rows.length) return <div data-testid="state-empty" style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>{empty ?? 'Aucun résultat.'}</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>{columns.map((c) => <th key={c.header} style={{ textAlign: c.align ?? 'left', padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, borderBottom: `1px solid ${C.border}`, width: c.width, whiteSpace: 'nowrap' }}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r); } : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default', borderBottom: `1px solid ${C.border}` }}>
              {columns.map((c) => <td key={c.header} style={{ textAlign: c.align ?? 'left', padding: '10px', color: C.text, verticalAlign: 'top' }}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Grid({ cols = 3, gap = 16, children, style }: { cols?: number; gap?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${cols >= 4 ? 150 : 250}px, 1fr))`, gap, ...style }}>{children}</div>;
}

export function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: '7px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', fontSize: 13, color: C.text, textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
