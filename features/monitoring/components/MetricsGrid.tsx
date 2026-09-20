// components/monitoring/MetricsGrid.tsx
// =========================================================
// Grille de KPIs pour le monitoring des agents
// =========================================================

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { AgentMetricsSummary } from '@/types/monitoring';
import {
  FaRobot,
  FaClock,
  FaComments,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaCoins,
  FaBrain,
} from 'react-icons/fa';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; isPositive: boolean };
}

function MetricCard({ label, value, subtitle, icon, color, trend }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-semibold mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

interface MetricsGridProps {
  metrics: AgentMetricsSummary | null;
  isLoading?: boolean;
}

export default function MetricsGrid({ metrics, isLoading }: MetricsGridProps) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  const formatMs = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms)}ms`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        label="Actions Totales"
        value={formatNumber(metrics.totalActions)}
        subtitle={`${metrics.pendingActions} en attente`}
        icon={<FaRobot className="text-lg text-indigo-600" />}
        color="bg-indigo-50"
      />
      <MetricCard
        label="En Attente"
        value={metrics.pendingActions}
        subtitle="Validation requise"
        icon={<FaClock className="text-lg text-amber-600" />}
        color="bg-amber-50"
      />
      <MetricCard
        label="Approuvées"
        value={metrics.approvedActions + metrics.executedActions}
        subtitle={`${metrics.executedActions} exécutées`}
        icon={<FaCheckCircle className="text-lg text-green-600" />}
        color="bg-green-50"
      />
      <MetricCard
        label="Échouées"
        value={metrics.failedActions + metrics.rejectedActions}
        subtitle={`${metrics.rejectedActions} rejetées`}
        icon={<FaTimesCircle className="text-lg text-red-600" />}
        color="bg-red-50"
      />
      <MetricCard
        label="Conversations"
        value={formatNumber(metrics.totalConversations)}
        subtitle={`${metrics.activeConversations} actives`}
        icon={<FaComments className="text-lg text-blue-600" />}
        color="bg-blue-50"
      />
      <MetricCard
        label="Confiance Moy."
        value={`${Math.round(metrics.avgConfidenceScore * 100)}%`}
        subtitle="Score IA"
        icon={<FaBrain className="text-lg text-purple-600" />}
        color="bg-purple-50"
      />
      <MetricCard
        label="Temps Réponse"
        value={formatMs(metrics.avgResponseTimeMs)}
        subtitle="Moyenne orchestrateur"
        icon={<FaExclamationTriangle className="text-lg text-orange-600" />}
        color="bg-orange-50"
      />
      <MetricCard
        label="Tokens Utilisés"
        value={formatNumber(metrics.totalTokensUsed)}
        subtitle="Coût IA cumulé"
        icon={<FaCoins className="text-lg text-teal-600" />}
        color="bg-teal-50"
      />
    </div>
  );
}
