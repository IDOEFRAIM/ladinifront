// components/monitoring/ConversationTimeline.tsx
// =========================================================
// Timeline des conversations avec les agents IA
// Affiche : query, response, exécution path, slots, confiance
// =========================================================

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Conversation } from '@/types/monitoring';
import { AgentTag, ConfidenceScore } from './AgentStatusBadge';
import ExecutionPathViewer from './ExecutionPathViewer';
import type { ExecutionPathStep } from '@/types/monitoring';

interface ConversationTimelineProps {
  conversations: Conversation[];
  isLoading?: boolean;
  showUser?: boolean; // Admin mode: show which user
}

export default function ConversationTimeline({
  conversations,
  isLoading,
  showUser = false,
}: ConversationTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-full mb-1" />
            <div className="h-3 bg-gray-200 rounded w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-2">💬</p>
        <p className="font-medium">Aucune conversation</p>
        <p className="text-xs mt-1">Les échanges avec les agents IA apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conv) => (
        <ConversationCard
          key={conv.id}
          conversation={conv}
          showUser={showUser}
        />
      ))}
    </div>
  );
}

// --- Single conversation card ---

function ConversationCard({
  conversation: conv,
  showUser,
}: {
  conversation: Conversation;
  showUser: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const modeIcon = conv.mode === 'voice' ? '🎤' : conv.mode === 'sms' ? '📱' : '💬';
  const timeStr = new Date(conv.createdAt).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      layout
      className={`bg-white rounded-xl border overflow-hidden transition-all ${
        conv.isWaitingForInput
          ? 'border-amber-200 ring-1 ring-amber-100'
          : 'border-gray-100'
      }`}
    >
      {/* Waiting badge */}
      {conv.isWaitingForInput && (
        <div className="bg-amber-50 px-4 py-1.5 border-b border-amber-100">
          <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
            <span className="animate-pulse">⏳</span> En attente de réponse utilisateur
            {conv.missingSlots && conv.missingSlots.length > 0 && (
              <span className="font-normal text-amber-600">
                — Infos manquantes: {(conv.missingSlots as string[]).join(', ')}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Content */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-sm">{modeIcon}</span>
          {conv.agentType && <AgentTag name={conv.agentType} />}
          {conv.crop && (
            <span className="text-xs bg-lime-50 text-lime-700 px-1.5 py-0.5 rounded">
              🌾 {conv.crop}
            </span>
          )}
          {conv.location && (
            <span className="text-xs bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">
              📍 {conv.location.name}
            </span>
          )}
          {showUser && conv.user && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              👤 {conv.user.name || conv.userId}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{timeStr}</span>
        </div>

        {/* Query (user message) */}
        <div className="mb-2">
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-400 mt-0.5 shrink-0">Q:</span>
            <p className="text-sm text-gray-800 leading-relaxed line-clamp-2">{conv.query}</p>
          </div>
        </div>

        {/* Response (agent message) */}
        {conv.response && (
          <div className="pl-4 border-l-2 border-green-200">
            <div className="flex items-start gap-2">
              <span className="text-xs text-green-500 mt-0.5 shrink-0">R:</span>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{conv.response}</p>
            </div>
          </div>
        )}

        {/* Bottom metrics */}
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
          <ConfidenceScore score={conv.confidenceScore} />
          {conv.responseTimeMs != null && (
            <span>⚡ {conv.responseTimeMs >= 1000 ? `${(conv.responseTimeMs / 1000).toFixed(1)}s` : `${conv.responseTimeMs}ms`}</span>
          )}
          {conv.totalTokensUsed > 0 && (
            <span>🪙 {conv.totalTokensUsed} tokens</span>
          )}
          {conv.executionPath && (
            <span className="text-indigo-500">
              🔗 {(conv.executionPath as ExecutionPathStep[]).length} étapes
            </span>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 bg-gray-50/50"
          >
            <div className="p-4 space-y-3">
              {/* Full response */}
              {conv.response && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Réponse complète</p>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border leading-relaxed whitespace-pre-wrap">
                    {conv.response}
                  </p>
                </div>
              )}

              {/* Execution Path */}
              {conv.executionPath && (
                <ExecutionPathViewer path={conv.executionPath as ExecutionPathStep[]} />
              )}

              {/* Missing slots */}
              {conv.missingSlots && (conv.missingSlots as string[]).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Données manquantes (slots)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(conv.missingSlots as string[]).map((slot, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio */}
              {conv.audioUrl && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">🔊 Audio</p>
                  <audio controls className="w-full h-8" src={conv.audioUrl} />
                </div>
              )}

              {/* Audit trail link */}
              {conv.auditTrailId && (
                <p className="text-xs text-gray-400">
                  🔗 Audit: <code className="font-mono text-indigo-600">{conv.auditTrailId}</code>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
