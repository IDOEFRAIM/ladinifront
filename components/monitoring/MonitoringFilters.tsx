// components/monitoring/MonitoringFilters.tsx
// =========================================================
// Panneau de filtres réutilisable pour le monitoring
// =========================================================

'use client';

import React from 'react';
import type { MonitoringFilters as Filters } from '@/types/monitoring';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';

interface MonitoringFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  showAgentFilter?: boolean;
  showStatusFilter?: boolean;
  showPriorityFilter?: boolean;
  showAgentTypeFilter?: boolean;
  showLocationFilter?: boolean;
  showDateFilter?: boolean;
}

const AGENT_NAMES = ['MarketplaceAgent', 'SentinelAgent', 'DoctorAgent', 'FormationAgent'];
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const AGENT_TYPES = ['sentinel', 'doctor', 'market', 'formation'];

export default function MonitoringFiltersPanel({
  filters,
  onChange,
  showAgentFilter = true,
  showStatusFilter = true,
  showPriorityFilter = false,
  showAgentTypeFilter = false,
  showDateFilter = true,
}: MonitoringFiltersProps) {
  const activeCount = Object.values(filters).filter((v) => v !== undefined && v !== '').length;

  const update = (key: keyof Filters, value: string | undefined) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const reset = () => {
    onChange({});
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      {/* Search */}
      <div className="relative mb-3">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => update('search', e.target.value)}
          placeholder="Rechercher dans les actions et conversations..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
          <FaFilter className="text-[10px]" /> Filtres
          {activeCount > 0 && (
            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </span>

        {showAgentFilter && (
          <select
            value={filters.agentName || ''}
            onChange={(e) => update('agentName', e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:ring-2 focus:ring-green-500"
          >
            <option value="">Tous les agents</option>
            {AGENT_NAMES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}

        {showStatusFilter && (
          <select
            value={filters.status || ''}
            onChange={(e) => update('status', e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:ring-2 focus:ring-green-500"
          >
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {showPriorityFilter && (
          <select
            value={filters.priority || ''}
            onChange={(e) => update('priority', e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:ring-2 focus:ring-green-500"
          >
            <option value="">Toutes priorités</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}

        {showAgentTypeFilter && (
          <select
            value={filters.agentType || ''}
            onChange={(e) => update('agentType', e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:ring-2 focus:ring-green-500"
          >
            <option value="">Tous types</option>
            {AGENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        {showDateFilter && (
          <>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => update('dateFrom', e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:ring-2 focus:ring-green-500"
            />
            <span className="text-xs text-gray-400">→</span>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => update('dateTo', e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:ring-2 focus:ring-green-500"
            />
          </>
        )}

        {activeCount > 0 && (
          <button
            onClick={reset}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto"
          >
            <FaTimes className="text-[10px]" /> Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
