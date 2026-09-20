// components/monitoring/AgentStatusBadge.tsx
// =========================================================
// Badge de statut pour les actions agents et la santé
// =========================================================

'use client';

import React from 'react';
import type { AgentActionStatus, AgentHealthLevel, ValidationPriority } from '@/types/monitoring';

// --- STATUS BADGE ---

const STATUS_CONFIG: Record<AgentActionStatus, { label: string; color: string; bgVar: string; textVar: string }> = {
  PENDING: { label: 'En attente', color: '#D97706', bgVar: 'linear-gradient(180deg, rgba(217,119,6,0.08), rgba(217,119,6,0.03))', textVar: 'var(--primary)', },
  APPROVED: { label: 'Approuvé', color: '#10B981', bgVar: 'linear-gradient(180deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))', textVar: 'var(--primary)', },
  REJECTED: { label: 'Rejeté', color: '#DC2626', bgVar: 'linear-gradient(180deg, rgba(220,38,38,0.08), rgba(220,38,38,0.03))', textVar: 'var(--primary)', },
  EXECUTED: { label: 'Exécuté', color: '#0EA5E9', bgVar: 'linear-gradient(180deg, rgba(14,165,233,0.08), rgba(14,165,233,0.03))', textVar: 'var(--primary)', },
  FAILED: { label: 'Échoué', color: '#DC2626', bgVar: 'linear-gradient(180deg, rgba(220,38,38,0.12), rgba(220,38,38,0.04))', textVar: 'var(--primary)', },
};

export function ActionStatusBadge({ status }: { status: AgentActionStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 700, background: cfg.bgVar, color: cfg.textVar }}>
      <span style={{ width: 8, height: 8, borderRadius: 8, background: cfg.color, boxShadow: `0 6px 18px ${cfg.color}33` }} />
      {cfg.label}
    </span>
  );
}

// --- HEALTH BADGE ---

const HEALTH_CONFIG: Record<AgentHealthLevel, { label: string; color: string; pulse: boolean }> = {
  healthy: { label: 'Opérationnel', color: '#10B981', pulse: true },
  degraded: { label: 'Dégradé', color: '#F59E0B', pulse: true },
  down: { label: 'Hors ligne', color: '#DC2626', pulse: false },
  unknown: { label: 'Inconnu', color: '#9CA3AF', pulse: false },
};

export function HealthBadge({ level }: { level: AgentHealthLevel }) {
  const cfg = HEALTH_CONFIG[level];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 700, background: `rgba(6,78,59,0.03)`, color: 'var(--foreground)' }}>
      <span style={{ position: 'relative', width: 12, height: 12 }}>
        {cfg.pulse && (
          <span style={{ position: 'absolute', inset: 0, borderRadius: 9999, boxShadow: `0 0 0 6px ${cfg.color}22`, opacity: 0.9 }} />
        )}
        <span style={{ position: 'relative', display: 'inline-block', width: 12, height: 12, borderRadius: 12, background: cfg.color }} />
      </span>
      {cfg.label}
    </span>
  );
}

// --- PRIORITY BADGE ---

const PRIORITY_CONFIG: Record<ValidationPriority, { label: string; bg: string; text: string; icon: string }> = {
  LOW: { label: 'Bas', bg: 'bg-slate-100', text: 'text-slate-600', icon: '▽' },
  MEDIUM: { label: 'Moyen', bg: 'bg-blue-50', text: 'text-blue-600', icon: '◆' },
  HIGH: { label: 'Haut', bg: 'bg-orange-50', text: 'text-orange-700', icon: '▲' },
  CRITICAL: { label: 'Critique', bg: 'bg-red-100', text: 'text-red-800', icon: '⚠' },
};

export function PriorityBadge({ priority }: { priority: ValidationPriority }) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${config.bg} ${config.text}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

// --- CONFIDENCE SCORE ---

export function ConfidenceScore({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-gray-400">—</span>;

  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? 'text-green-600' :
    pct >= 50 ? 'text-yellow-600' :
    'text-red-600';

  const barColor =
    pct >= 80 ? 'bg-green-500' :
    pct >= 50 ? 'bg-yellow-500' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-[60px]">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${color}`}>{pct}%</span>
    </div>
  );
}

// --- AGENT NAME TAG ---

const AGENT_COLORS: Record<string, string> = {
  sentinel: 'bg-indigo-100 text-indigo-700',
  doctor: 'bg-emerald-100 text-emerald-700',
  market: 'bg-amber-100 text-amber-700',
  formation: 'bg-purple-100 text-purple-700',
  MarketplaceAgent: 'bg-amber-100 text-amber-700',
  SentinelAgent: 'bg-indigo-100 text-indigo-700',
  DoctorAgent: 'bg-emerald-100 text-emerald-700',
  FormationAgent: 'bg-purple-100 text-purple-700',
};

export function AgentTag({ name }: { name: string }) {
  const colorClass = AGENT_COLORS[name] || 'bg-gray-100 text-gray-700';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', fontWeight: 700, background: 'rgba(0,0,0,0.03)', color: 'var(--foreground)' }}>
      🤖 {name}
    </span>
  );
}
