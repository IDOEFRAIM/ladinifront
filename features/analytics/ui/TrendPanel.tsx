'use client';

import React, { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { C, Card, DataState } from '@/features/monitoring/cockpit/ui/primitives';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { fmtValue } from '../format';
import type { SeriesPoint, TimeseriesResponse } from '../types';
import { ReliabilityBadge } from './MetricCard';

const PALETTE = ['#047857', '#1D4ED8', '#B45309', '#7C3AED', '#0E7490'];

/** Une ligne par unité canonique quand la série est physique ; sinon une seule ligne. `null` reste un TROU (jamais 0). */
export function pivotSeries(points: SeriesPoint[]): { rows: Record<string, string | number | null>[]; keys: string[] } {
  const keys = Array.from(new Set(points.map((p) => p.canonical_unit ?? 'value')));
  const byBucket = new Map<string, Record<string, string | number | null>>();
  for (const p of points) {
    const row = byBucket.get(p.bucket) ?? { bucket: p.bucket };
    row[p.canonical_unit ?? 'value'] = p.value;
    byBucket.set(p.bucket, row);
  }
  return { rows: Array.from(byBucket.values()), keys };
}

const shortDay = (iso: string) => iso.slice(5).replace('-', '/');

export function TrendChart({ points, unit }: { points: SeriesPoint[]; unit: string }) {
  const { rows, keys } = useMemo(() => pivotSeries(points), [points]);
  const physical = keys[0] !== 'value';
  return (
    <div data-testid="trend-chart" style={{ width: '100%', height: 170 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(6,78,59,0.08)" vertical={false} />
          <XAxis dataKey="bucket" tickFormatter={shortDay} tick={{ fontSize: 10, fill: C.muted }} minTickGap={24} />
          <YAxis tick={{ fontSize: 10, fill: C.muted }} width={44} tickFormatter={(v: number) => fmtValue(v, unit === 'FCFA' ? null : unit)} />
          <Tooltip formatter={(v) => (v === null || v === undefined ? '—' : fmtValue(Number(v), unit))} labelFormatter={(l) => String(l)} />
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} name={physical ? k : undefined} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendPanel({ metric, title, params, endpointBase = '/api/admin/analytics/buyers' }: { metric: string; title: string; params: Record<string, string>; endpointBase?: string }) {
  const { data, error, loading, refetch } = useCockpitData<TimeseriesResponse>(`${endpointBase}/metrics/${metric}/timeseries`, params);
  const hasValues = !!data?.points?.some((p) => p.value !== null);
  return (
    <Card testId={`trend-${metric}`} title={title} right={data && <ReliabilityBadge reliability={data.reliability} title={data.notes[0]} />} style={{ padding: 14 }}>
      <DataState loading={loading} error={error} hasData={!!data} empty={!!data && !hasValues} emptyText="Aucune donnée sur la période." onRetry={refetch}>
        {data && hasValues && <TrendChart points={data.points} unit={data.unit} />}
      </DataState>
    </Card>
  );
}
