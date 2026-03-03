// components/monitoring/ActionApprovalCard.tsx
// =========================================================
// Carte d'approbation pour les AgentActions en attente
// Utilisée dans le dashboard admin et la vue producteur
// =========================================================

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { AgentAction } from '@/types/monitoring';
import { ActionStatusBadge, PriorityBadge, AgentTag } from './AgentStatusBadge';
import { AgentActionService } from '@/services/monitoring.service';
import toast from 'react-hot-toast';

interface ActionApprovalCardProps {
  action: AgentAction;
  isAdmin?: boolean;
  onApproved?: (action: AgentAction) => void;
}

export default function ActionApprovalCard({
  action,
  isAdmin = false,
  onApproved,
}: ActionApprovalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    setIsSubmitting(true);
    try {
      const updated = await AgentActionService.approve({
        actionId: action.id,
        decision,
        adminNotes: notes || undefined,
      });
      toast.success(
        decision === 'APPROVED'
          ? `Action approuvée ✓`
          : `Action rejetée ✕`
      );
      onApproved?.(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de validation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const payload = action.payload || {};
  const timeAgo = formatTimeAgo(new Date(action.createdAt));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
        action.priority === 'CRITICAL'
          ? 'border-red-200 ring-1 ring-red-100'
          : action.priority === 'HIGH'
          ? 'border-orange-200'
          : 'border-gray-100'
      }`}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <AgentTag name={action.agentName} />
              <span className="text-xs font-mono text-gray-400">{action.actionType}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ActionStatusBadge status={action.status} />
              <PriorityBadge priority={action.priority} />
              <span className="text-xs text-gray-400">{timeAgo}</span>
            </div>
          </div>

          {/* Summary */}
          {payload.item && (
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-gray-900">{payload.item}</p>
              {payload.amount != null && (
                <p className="text-xs text-gray-500">
                  {payload.amount.toLocaleString('fr-FR')} XOF
                </p>
              )}
            </div>
          )}
        </div>

        {/* User & Order info */}
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          {action.user && (
            <span>👤 {action.user.name || action.userId}</span>
          )}
          {action.order && (
            <span>📦 Commande #{action.order.id.slice(-6)} — {action.order.totalAmount.toLocaleString('fr-FR')} XOF</span>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-t border-gray-100 p-4 bg-gray-50/50"
        >
          {/* AI Reasoning */}
          {action.aiReasoning && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">🧠 Raisonnement IA</p>
              <p className="text-sm text-gray-700 bg-white p-2.5 rounded-lg border border-gray-100 leading-relaxed">
                {action.aiReasoning}
              </p>
            </div>
          )}

          {/* Payload details */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">📋 Détails (payload)</p>
            <pre className="text-xs bg-white p-2.5 rounded-lg border border-gray-100 overflow-auto max-h-32 font-mono text-gray-600">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>

          {/* Audit trail link */}
          {action.auditTrailId && (
            <p className="text-xs text-gray-400 mb-3">
              🔗 Audit trail: <code className="font-mono text-indigo-600">{action.auditTrailId}</code>
            </p>
          )}

          {/* Admin notes (if already validated) */}
          {action.adminNotes && (
            <div className="mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-100">
              <p className="text-xs font-semibold text-yellow-700">📝 Notes admin</p>
              <p className="text-sm text-yellow-800">{action.adminNotes}</p>
            </div>
          )}

          {/* Approval buttons (admin only, pending only) */}
          {isAdmin && action.status === 'PENDING' && (
            <div className="mt-4 space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes de validation (optionnel)..."
                className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleDecision('APPROVED')}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? '...' : '✓ Approuver'}
                </button>
                <button
                  onClick={() => handleDecision('REJECTED')}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 bg-red-50 text-red-700 text-sm font-bold rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
                >
                  {isSubmitting ? '...' : '✕ Rejeter'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// --- Utility ---

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins}min`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
