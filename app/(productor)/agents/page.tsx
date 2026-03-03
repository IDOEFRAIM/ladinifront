'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionApprovalCard, ConversationTimeline, AgentActivityFeed, AgentTag } from '@/components/monitoring';
import { useProducerMonitoringView, useMonitoringSSE } from '@/hooks/useAgentMonitor';
import type { AgentAction, Conversation, ProducerMonitoringView } from '@/types/monitoring';
import { Bot, MessageSquare, BarChart3, Zap } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

type TabId = 'overview' | 'conversations' | 'actions' | 'live';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Apercu', icon: BarChart3 },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'actions', label: 'Actions', icon: Bot },
  { id: 'live', label: 'Temps Reel', icon: Zap },
];

function GlassCard({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }} {...props}>{children}</div>;
}

const HeaderSection = () => (
  <header>
    <h1 style={{ fontFamily: F.heading, fontSize: '1.5rem', fontWeight: 900, color: C.forest, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Bot size={22} color={C.emerald} /> Mes Agents IA
    </h1>
    <p style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted, marginTop: 4 }}>Suivez les actions et conversations de vos agents intelligents</p>
  </header>
);

const QuickStatsSection = ({ metrics }: { metrics: any }) => (
  <div className="grid grid-cols-3" style={{ gap: 12 }}>
    {[
      { label: 'Interactions', val: metrics?.totalInteractions || 0, color: C.emerald },
      { label: 'Reponse moy.', val: metrics?.avgResponseTime ? `${(metrics.avgResponseTime / 1000).toFixed(1)}s` : '\u2014', color: '#3B82F6' },
      { label: 'Agent favori', val: metrics?.topAgentUsed ? <AgentTag name={metrics.topAgentUsed} /> : '\u2014', color: '#8B5CF6' },
    ].map((stat, i) => (
      <GlassCard key={i} style={{ padding: 16, textAlign: 'center' as const }}>
        <div style={{ fontFamily: F.heading, fontSize: '1.4rem', fontWeight: 900, color: stat.color }}>{stat.val}</div>
        <p style={{ fontFamily: F.body, fontSize: '0.65rem', color: C.muted, marginTop: 4 }}>{stat.label}</p>
      </GlassCard>
    ))}
  </div>
);

const TabRenderer = ({ activeTab, data, isLoading }: { activeTab: TabId; data: ProducerMonitoringView | undefined; isLoading: boolean }) => {
  const conversations = (data?.myConversations || []) as unknown as Conversation[];
  const actions = (data?.myActions || []) as unknown as AgentAction[];

  const components: Record<TabId, React.ReactNode> = {
    overview: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h2 style={{ fontFamily: F.heading, fontSize: '0.95rem', fontWeight: 800, color: C.text }}>Conversations recentes</h2>
        <ConversationTimeline conversations={conversations} isLoading={isLoading} />
      </div>
    ),
    conversations: <ConversationTimeline conversations={conversations} isLoading={isLoading} />,
    actions: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {actions.length > 0 ? (
          actions.map(action => <ActionApprovalCard key={action.id} action={action} isAdmin={false} />)
        ) : (
          <GlassCard style={{ padding: '48px 24px', textAlign: 'center' as const }}>
            <Bot size={32} color={C.muted} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <p style={{ fontFamily: F.body, fontSize: '0.85rem', fontWeight: 600, color: C.muted }}>Aucune action pour le moment</p>
          </GlassCard>
        )}
      </div>
    ),
    live: <AgentActivityFeed maxEvents={30} />,
  };

  return (
    <motion.div key={activeTab} initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} transition={{ duration: 0.2 }}>
      {isLoading && activeTab !== 'live' ? (
        <div style={{ textAlign: 'center' as const, padding: '32px 0', color: C.muted, fontFamily: F.body }}>Chargement des donnees...</div>
      ) : components[activeTab]}
    </motion.div>
  );
};

export default function ProducerAgentsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { data, isLoading } = useProducerMonitoringView();
  useMonitoringSSE('PRODUCER');
  const suggestions = useMemo(() => data?.agentSuggestions || [], [data]);

  return (
    <div style={{ maxWidth: 1024, margin: '0 auto', padding: '24px 16px', fontFamily: F.body, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <HeaderSection />
      <QuickStatsSection metrics={data?.performanceMetrics} />

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: 16, padding: 20, overflow: 'hidden' }}>
            <h2 style={{ fontFamily: F.heading, fontSize: '0.8rem', fontWeight: 800, color: C.amber, marginBottom: 10 }}>Suggestions ({suggestions.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.slice(0, 2).map((s: any) => (
                <div key={s.id} style={{ background: 'white', borderRadius: 12, padding: 14, border: '1px solid rgba(217,119,6,0.1)', fontSize: '0.75rem', color: C.muted }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontWeight: 700 }}><AgentTag name={s.agentName} /> <span>{s.actionType}</span></div>
                  {s.aiReasoning}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <nav style={{ display: 'flex', gap: 4, background: 'rgba(6,78,59,0.04)', borderRadius: 14, padding: 4 }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', fontSize: '0.7rem', fontWeight: activeTab === tab.id ? 800 : 600, borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === tab.id ? 'white' : 'transparent', color: activeTab === tab.id ? C.forest : C.muted, boxShadow: activeTab === tab.id ? '0 2px 8px rgba(6,78,59,0.06)' : 'none' }}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </nav>

      <TabRenderer activeTab={activeTab} data={data ?? undefined} isLoading={isLoading} />
    </div>
  );
}
