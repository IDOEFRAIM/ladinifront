'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MetricsGrid, AgentHealthGrid, ActionApprovalCard, ConversationTimeline, MonitoringFiltersPanel, AgentActivityFeed } from '@/components/monitoring';
import { useAdminMonitoringView, useAgentActions, useConversations, useMonitoringSSE } from '@/hooks/useAgentMonitor';
import type { MonitoringFilters, PaginationParams, AgentAction } from '@/types/monitoring';
import { Bot, ListChecks, MessageSquare, HeartPulse, Zap, ArrowRight } from 'lucide-react';

const C = { forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

type TabId = 'overview' | 'actions' | 'conversations' | 'health' | 'feed';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: "Vue d'ensemble", icon: <Bot size={16} /> },
  { id: 'actions', label: 'Actions Agents', icon: <ListChecks size={16} /> },
  { id: 'conversations', label: 'Conversations', icon: <MessageSquare size={16} /> },
  { id: 'health', label: 'Santé Agents', icon: <HeartPulse size={16} /> },
  { id: 'feed', label: 'Temps Réel', icon: <Zap size={16} /> },
];

function GlassCard({ children, style }: any) {
  return <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}>{children}</div>;
}

function OverviewTab({ adminView, viewLoading, handleActionApproved }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <MetricsGrid metrics={adminView?.metrics || null} isLoading={viewLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.forest, fontFamily: F.heading, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            Actions en Attente
            {adminView?.pendingActions?.length > 0 && (
              <span style={{ fontSize: 11, background: 'rgba(217,119,6,0.1)', color: C.amber, padding: '2px 10px', borderRadius: 100, fontWeight: 700 }}>{adminView.pendingActions.length}</span>
            )}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {viewLoading ? (
              [1,2,3].map(i => <GlassCard key={i} style={{ padding: 20, height: 60 }}><div style={{ background: C.border, borderRadius: 8, height: 16, width: 160 }} /></GlassCard>)
            ) : (adminView?.pendingActions || []).length === 0 ? (
              <GlassCard style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}></p>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.muted, fontFamily: F.body }}>Aucune action en attente</p>
              </GlassCard>
            ) : (
              adminView?.pendingActions.map((action: any) => (
                <ActionApprovalCard key={action.id} action={action as unknown as AgentAction} isAdmin onApproved={handleActionApproved} />
              ))
            )}
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.forest, fontFamily: F.heading, marginBottom: 12 }}>Conversations Récentes</h2>
          <ConversationTimeline conversations={(adminView?.recentConversations || []) as unknown as import('@/types/monitoring').Conversation[]} isLoading={viewLoading} showUser />
        </div>
      </div>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: C.forest, fontFamily: F.heading, marginBottom: 12 }}>Santé des Agents</h2>
        <AgentHealthGrid agents={(adminView?.agentHealth || []) as unknown as import('@/types/monitoring').AgentHealthStatus[]} isLoading={viewLoading} />
      </div>
    </div>
  );
}

function ActionsTab({ actionFilters, setActionFilters, actionsLoading, actionsData, setActionPagination, handleActionApproved }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <MonitoringFiltersPanel filters={actionFilters} onChange={setActionFilters} showPriorityFilter />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {actionsLoading ? (
          <GlassCard style={{ padding: 40, textAlign: 'center' }}><p style={{ color: C.muted }}>Chargement...</p></GlassCard>
        ) : (actionsData?.data || []).length === 0 ? (
          <GlassCard style={{ padding: 60, textAlign: 'center' }}>
            <p style={{ fontSize: 36, marginBottom: 8 }}></p>
            <p style={{ fontWeight: 600, color: C.muted }}>Aucune action trouvée</p>
          </GlassCard>
        ) : (
          <>
            <p style={{ fontSize: 12, color: C.muted }}>{actionsData?.totalCount || 0} actions au total</p>
            {actionsData?.data.map((action: any) => <ActionApprovalCard key={action.id} action={action} isAdmin onApproved={handleActionApproved} />)}
            {actionsData?.hasMore && (
              <div style={{ textAlign: 'center', paddingTop: 16 }}>
                <button onClick={() => setActionPagination((p: any) => ({ ...p, cursor: actionsData.nextCursor || undefined }))}
                  style={{ padding: '10px 24px', borderRadius: 100, border: 'none', background: 'rgba(6,78,59,0.06)', color: C.forest, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: F.body, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Charger plus <ArrowRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ConversationsTab({ convFilters, setConvFilters, convsLoading, convsData, setConvPagination }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <MonitoringFiltersPanel filters={convFilters} onChange={setConvFilters} showStatusFilter={false} showAgentTypeFilter />
      <ConversationTimeline conversations={convsData?.data || []} isLoading={convsLoading} showUser />
      {convsData?.hasMore && (
        <div style={{ textAlign: 'center', paddingTop: 16 }}>
          <button onClick={() => setConvPagination((p: any) => ({ ...p, cursor: convsData.nextCursor || undefined }))}
            style={{ padding: '10px 24px', borderRadius: 100, border: 'none', background: 'rgba(6,78,59,0.06)', color: C.forest, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: F.body, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Charger plus <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function HealthTab({ adminView, viewLoading }: any) {
  return <AgentHealthGrid agents={(adminView?.agentHealth || []) as unknown as import('@/types/monitoring').AgentHealthStatus[]} isLoading={viewLoading} />;
}

function FeedTab() {
  return <AgentActivityFeed maxEvents={100} showHeartbeats />;
}

export default function AdminMonitoringPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [actionFilters, setActionFilters] = useState<MonitoringFilters>({});
  const [convFilters, setConvFilters] = useState<MonitoringFilters>({});
  const [actionPagination, setActionPagination] = useState<PaginationParams>({ limit: 20 });
  const [convPagination, setConvPagination] = useState<PaginationParams>({ limit: 20 });

  const { data: adminView, isLoading: viewLoading, refetchData: refetchView } = useAdminMonitoringView();
  const { data: actionsData, isLoading: actionsLoading, counts, refetchData: refetchActions } = useAgentActions(actionFilters, actionPagination);
  const { data: convsData, isLoading: convsLoading, refetchData: refetchConvs } = useConversations(convFilters, convPagination);

  useMonitoringSSE('ADMIN');

  const handleActionApproved = useCallback((_action: AgentAction) => { refetchView(); refetchActions(); }, [refetchView, refetchActions]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px', fontFamily: F.body }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.forest, fontFamily: F.heading, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bot size={24} /> Monitoring Agents IA
          </h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Supervision des protocoles MCP/A2A  Actions, conversations et santé des agents</p>
        </div>
        {counts['PENDING'] > 0 && (
          <span style={{ background: 'rgba(217,119,6,0.1)', color: C.amber, fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 100, animation: 'pulse 2s infinite' }}>
             {counts['PENDING']} en attente
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(6,78,59,0.04)', borderRadius: 16, padding: 4, overflowX: 'auto', marginBottom: 24 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: F.body,
              background: activeTab === tab.id ? C.glass : 'transparent', color: activeTab === tab.id ? C.forest : C.muted, boxShadow: activeTab === tab.id ? '0 2px 8px rgba(6,78,59,0.06)' : 'none', backdropFilter: activeTab === tab.id ? 'blur(12px)' : 'none' }}>
            {tab.icon} {tab.label}
            {tab.id === 'actions' && counts['PENDING'] > 0 && (
              <span style={{ background: C.amber, color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100, marginLeft: 4 }}>{counts['PENDING']}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'overview' && <OverviewTab adminView={adminView} viewLoading={viewLoading} handleActionApproved={handleActionApproved} />}
        {activeTab === 'actions' && <ActionsTab actionFilters={actionFilters} setActionFilters={setActionFilters} actionsLoading={actionsLoading} actionsData={actionsData} setActionPagination={setActionPagination} handleActionApproved={handleActionApproved} />}
        {activeTab === 'conversations' && <ConversationsTab convFilters={convFilters} setConvFilters={setConvFilters} convsLoading={convsLoading} convsData={convsData} setConvPagination={setConvPagination} />}
        {activeTab === 'health' && <HealthTab adminView={adminView} viewLoading={viewLoading} />}
        {activeTab === 'feed' && <FeedTab />}
      </motion.div>
    </div>
  );
}
