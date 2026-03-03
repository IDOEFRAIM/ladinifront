'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ConversationTimeline } from '@/components/monitoring';
import { useBuyerMonitoringView, useMonitoringSSE } from '@/hooks/useAgentMonitor';
import type { Conversation, AgentAction } from '@/types/monitoring';
import { ActionStatusBadge, AgentTag } from '@/components/monitoring/AgentStatusBadge';
import { MessageSquare, Bot, Clock, Package } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

const GlassCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}>{children}</div>
);

function WaitingForInputAlert({ waitingForInput }: { waitingForInput: Conversation[] }) {
  if (!waitingForInput || waitingForInput.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard style={{ padding: 20, border: `1px solid rgba(217,119,6,0.15)`, background: 'rgba(217,119,6,0.04)' }}>
        <h2 style={{ fontFamily: F.heading, fontSize: '0.85rem', fontWeight: 800, color: C.amber, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} /> En attente de votre reponse ({waitingForInput.length})
        </h2>
        {waitingForInput.map((c) => (
          <GlassCard key={c.id} style={{ padding: 14, marginBottom: 8, borderRadius: 16 }}>
            <p style={{ fontFamily: F.body, fontSize: '0.85rem', color: C.text, margin: 0 }}>{c.query}</p>
            {c.missingSlots && (c.missingSlots as string[]).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {(c.missingSlots as string[]).map((slot, i) => (
                  <span key={i} style={{ fontSize: '0.75rem', background: 'rgba(217,119,6,0.08)', color: C.amber, padding: '4px 12px', borderRadius: 100, fontFamily: F.body, fontWeight: 600 }}>
                    {slot}
                  </span>
                ))}
              </div>
            )}
          </GlassCard>
        ))}
      </GlassCard>
    </motion.div>
  );
}

function AgentOrdersList({ agentOrders }: { agentOrders: AgentAction[] }) {
  if (!agentOrders || agentOrders.length === 0) return null;
  return (
    <div>
      <h2 style={{ fontFamily: F.heading, fontSize: '0.95rem', fontWeight: 800, color: C.forest, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Package size={18} color={C.emerald} /> Commandes via Agents
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {agentOrders.map((a) => (
          <GlassCard key={a.id} style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <AgentTag name={a.agentName} />
              <ActionStatusBadge status={a.status} />
            </div>
            {a.order && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: F.body, fontSize: '0.85rem' }}>
                <span style={{ color: C.muted }}>Commande #{a.order.id.slice(-6)}</span>
                <span style={{ fontFamily: F.heading, fontWeight: 800, color: C.forest }}>{a.order.totalAmount.toLocaleString('fr-FR')} XOF</span>
              </div>
            )}
            {a.aiReasoning && <p style={{ fontFamily: F.body, fontSize: '0.75rem', color: C.muted, marginTop: 10, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{a.aiReasoning}</p>}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

export default function BuyerConversationsPage() {
  const { data, isLoading } = useBuyerMonitoringView();
  useMonitoringSSE('USER');

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: F.heading, fontSize: '1.3rem', fontWeight: 800, color: C.forest, margin: 0 }}>Mes Conversations IA</h1>
            <p style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted, margin: 0 }}>Historique de vos echanges avec les agents FrontAg</p>
          </div>
        </div>
      </motion.div>

      <WaitingForInputAlert waitingForInput={data?.waitingForInput as Conversation[] || []} />
      <AgentOrdersList agentOrders={data?.agentOrders as AgentAction[] || []} />

      {/* Conversation History */}
      <div>
        <h2 style={{ fontFamily: F.heading, fontSize: '0.95rem', fontWeight: 800, color: C.forest, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={18} color={C.emerald} /> Historique
        </h2>
        <ConversationTimeline conversations={(data?.conversations || []) as unknown as Conversation[]} isLoading={isLoading} />
      </div>
    </div>
  );
}
