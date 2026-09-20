// components/monitoring/ExecutionPathViewer.tsx
// =========================================================
// Visualisation du cheminement entre agents (A2A)
// Ex: Router → MarketExpert → WeatherServer
// =========================================================

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { ExecutionPathStep } from '@/types/monitoring';

interface ExecutionPathViewerProps {
  path: ExecutionPathStep[] | null | undefined;
  compact?: boolean;
}

const STEP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.12)', text: 'var(--foreground)' },
  error: { bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.12)', text: 'var(--foreground)' },
  skipped: { bg: 'rgba(156,163,175,0.04)', border: 'rgba(156,163,175,0.08)', text: 'var(--muted)' },
  default: { bg: 'rgba(14,165,233,0.06)', border: 'rgba(14,165,233,0.12)', text: 'var(--foreground)' },
};

export default function ExecutionPathViewer({ path, compact = false }: ExecutionPathViewerProps) {
  if (!path || path.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
        Aucun chemin d&apos;exécution disponible
      </p>
    );
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {path.map((step, i) => (
          <React.Fragment key={i}>
            <span style={{ fontSize: 12, fontFamily: 'monospace', padding: '4px 8px', borderRadius: 8, background: STEP_COLORS[step.status || 'default'].bg, color: STEP_COLORS[step.status || 'default'].text }}>
              {step.agent}
            </span>
            {i < path.length - 1 && (
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>→</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  const totalDuration = path.reduce((sum, s) => sum + (s.durationMs || 0), 0);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Chemin d&apos;exécution A2A
        </h4>
        {totalDuration > 0 && (
          <span className="text-xs text-gray-400">
            Total: {totalDuration >= 1000 ? `${(totalDuration / 1000).toFixed(1)}s` : `${totalDuration}ms`}
          </span>
        )}
      </div>

      {/* Path visualization */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />

        <div className="space-y-3">
          {path.map((step, i) => {
            const colors = STEP_COLORS[step.status || 'default'];
            const widthPct = totalDuration > 0 && step.durationMs
              ? Math.max((step.durationMs / totalDuration) * 100, 5)
              : 0;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{ position: 'relative', display: 'flex', gap: 12, paddingLeft: 8, alignItems: 'flex-start' }}
              >
                {/* Node */}
                <div style={{ position: 'relative', zIndex: 10, width: 20, height: 20, borderRadius: 20, border: `2px solid ${colors.border}`, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10 }}>
                    {step.status === 'success' ? '✓' : step.status === 'error' ? '✕' : step.status === 'skipped' ? '–' : '●'}
                  </span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.bg, padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: colors.text }}>
                      {step.agent}
                    </span>
                    {step.durationMs !== undefined && (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {step.durationMs >= 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
                      </span>
                    )}
                  </div>
                  {step.action && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{step.action}</p>
                  )}
                  {/* Duration bar */}
                  {widthPct > 0 && (
                    <div style={{ marginTop: 8, height: 8, background: 'rgba(0,0,0,0.04)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 8, background: step.status === 'error' ? '#FB7185' : '#60A5FA', width: `${widthPct}%` }} />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
