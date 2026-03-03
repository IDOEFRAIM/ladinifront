// components/monitoring/AgentActivityFeed.tsx
// =========================================================
// Feed d'activité en temps réel des agents
// Affiche les derniers événements avec auto-scroll
// =========================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MonitoringEvent } from '@/types/monitoring';
import { monitoringSSE } from '@/services/monitoring.service';
import { AgentTag } from './AgentStatusBadge';

interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  agentName?: string;
  timestamp: string;
  color: string;
  icon: string;
}

const EVENT_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  'agent:action:created': { icon: '🆕', color: 'border-l-blue-400', label: 'Nouvelle action' },
  'agent:action:approved': { icon: '✅', color: 'border-l-green-400', label: 'Action approuvée' },
  'agent:action:rejected': { icon: '❌', color: 'border-l-red-400', label: 'Action rejetée' },
  'agent:action:updated': { icon: '🔄', color: 'border-l-gray-400', label: 'Action mise à jour' },
  'conversation:new': { icon: '💬', color: 'border-l-indigo-400', label: 'Nouvelle conversation' },
  'conversation:response': { icon: '🤖', color: 'border-l-green-400', label: 'Réponse agent' },
  'conversation:waiting': { icon: '⏳', color: 'border-l-amber-400', label: 'En attente' },
  'heartbeat': { icon: '💚', color: 'border-l-gray-200', label: 'Heartbeat' },
};

interface AgentActivityFeedProps {
  maxEvents?: number;
  showHeartbeats?: boolean;
}

export default function AgentActivityFeed({
  maxEvents = 50,
  showHeartbeats = false,
}: AgentActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventCounter = useRef(0);

  useEffect(() => {
    const unsub = monitoringSSE.on('*', (event: MonitoringEvent) => {
      if (!showHeartbeats && event.type === 'heartbeat') return;

      const config = EVENT_CONFIG[event.type] || EVENT_CONFIG['agent:action:updated'];
      const data = event.data as Record<string, unknown>;

      const activityEvent: ActivityEvent = {
        id: `${eventCounter.current++}`,
        type: event.type,
        message: buildMessage(event.type, data),
        agentName: event.agentName || (data?.agentName as string) || (data?.agentType as string),
        timestamp: event.timestamp,
        color: config.color,
        icon: config.icon,
      };

      setEvents((prev) => [activityEvent, ...prev].slice(0, maxEvents));
    });

    const checkInterval = setInterval(() => {
      setIsConnected(monitoringSSE.isConnected);
    }, 3000);

    return () => {
      unsub();
      clearInterval(checkInterval);
    };
  }, [maxEvents, showHeartbeats]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          ⚡ Activité Temps Réel
        </h3>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'Connecté' : 'Déconnecté'}
          </span>
          {events.length > 0 && (
            <button
              onClick={() => setEvents([])}
              className="text-[10px] text-gray-400 hover:text-gray-600"
            >
              Vider
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        className="max-h-[400px] overflow-y-auto divide-y divide-gray-50"
      >
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-1">📡</p>
            <p className="text-xs">En attente d&apos;événements...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`px-4 py-2.5 border-l-3 ${event.color} hover:bg-gray-50/50 transition-colors`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm shrink-0">{event.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-700 truncate">{event.message}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.agentName && <AgentTag name={event.agentName} />}
                      <span className="text-[10px] text-gray-400">
                        {new Date(event.timestamp).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// --- Helpers ---

function buildMessage(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'agent:action:created':
      return `Action ${data.actionType || 'N/A'} créée — ${(data.agentName as string) || ''}`;
    case 'agent:action:approved':
      return `Action ${data.actionType || ''} approuvée par l'admin`;
    case 'agent:action:rejected':
      return `Action ${data.actionType || ''} rejetée`;
    case 'conversation:new':
      return `Nouvelle question: "${((data.query as string) || '').slice(0, 60)}..."`;
    case 'conversation:response':
      return `Réponse générée pour ${data.agentType || 'agent'}`;
    case 'conversation:waiting':
      return `En attente d'input utilisateur (${((data.missingSlots as string[]) || []).join(', ')})`;
    case 'heartbeat':
      return `Système actif — ${(data as Record<string, unknown>).pendingCount || 0} actions en attente`;
    default:
      return `Événement: ${type}`;
  }
}
