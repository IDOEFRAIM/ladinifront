// components/monitoring/AgentHealthGrid.tsx
// =========================================================
// Grille d'état de santé de chaque agent MCP/A2A
// =========================================================

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { AgentHealthStatus } from '@/types/monitoring';
import { HealthBadge } from './AgentStatusBadge';

interface AgentHealthGridProps {
  agents: AgentHealthStatus[];
  isLoading?: boolean;
}

export default function AgentHealthGrid({ agents, isLoading }: AgentHealthGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-3xl mb-2">🤖</p>
        <p className="text-sm">Aucun agent enregistré</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {agents.map((agent, i) => (
        <motion.div
          key={agent.agentName}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all ${
            agent.status === 'down'
              ? 'border-red-200'
              : agent.status === 'degraded'
              ? 'border-yellow-200'
              : 'border-gray-100'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold font-mono text-gray-900">
                🤖 {agent.agentName}
              </h3>
              <HealthBadge level={agent.status} />
            </div>
            {agent.errorRate > 0 && (
              <div className="text-right">
                <p className={`text-lg font-black ${
                  agent.errorRate > 0.3 ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {Math.round(agent.errorRate * 100)}%
                </p>
                <p className="text-[10px] text-gray-400">Erreurs</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Actions (24h)</span>
              <span className="font-semibold text-gray-700">{agent.actionsLast24h}</span>
            </div>
            {agent.avgResponseTimeMs > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Temps réponse moy.</span>
                <span className="font-semibold text-gray-700">
                  {agent.avgResponseTimeMs >= 1000
                    ? `${(agent.avgResponseTimeMs / 1000).toFixed(1)}s`
                    : `${agent.avgResponseTimeMs}ms`}
                </span>
              </div>
            )}
            {agent.lastActivityAt && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Dernière activité</span>
                <span className="text-gray-400">
                  {new Date(agent.lastActivityAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Error rate bar */}
          <div className="mt-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  agent.errorRate > 0.3
                    ? 'bg-red-500'
                    : agent.errorRate > 0.1
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.max(100 - agent.errorRate * 100, 5)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5 text-right">
              {Math.round((1 - agent.errorRate) * 100)}% uptime
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
