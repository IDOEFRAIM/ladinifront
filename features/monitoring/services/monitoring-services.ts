import type { AgentAction, Conversation, AgentMetricsSummary, MonitoringFilters, PaginationParams, PaginatedResponse, ApprovalPayload, BulkApprovalPayload, AdminMonitoringView, ProducerMonitoringView, BuyerMonitoringView, AgentHealthStatus } from '@/types/monitoring';
import { BASE, buildQueryString, fetcher } from '@/features/monitoring/services/monitoring-http';

export const AgentActionService = {
  /** Liste paginée des actions avec filtres */
  async list(
    filters?: MonitoringFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<AgentAction>> {
    const qs = buildQueryString(filters, pagination);
    return fetcher(`${BASE}/actions${qs}`);
  },

  /** Détail d'une action */
  async getById(id: string): Promise<AgentAction> {
    return fetcher(`${BASE}/actions/${id}`);
  },

  /** Approuver / Rejeter une action (admin uniquement) */
  async approve(payload: ApprovalPayload): Promise<AgentAction> {
    return fetcher(`${BASE}/actions/${payload.actionId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /** Approbation en masse */
  async bulkApprove(payload: BulkApprovalPayload): Promise<{ updated: number }> {
    return fetcher(`${BASE}/actions/bulk-approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /** Compteur par statut (pour badges temps réel) */
  async countByStatus(): Promise<Record<string, number>> {
    return fetcher(`${BASE}/actions/counts`);
  },
};

// =========================================================
// 2. CONVERSATIONS
// =========================================================

export const ConversationService = {
  /** Liste paginée des conversations */
  async list(
    filters?: MonitoringFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Conversation>> {
    const qs = buildQueryString(filters, pagination);
    return fetcher(`${BASE}/conversations${qs}`);
  },

  /** Détail d'une conversation */
  async getById(id: string): Promise<Conversation> {
    return fetcher(`${BASE}/conversations/${id}`);
  },

  /** Conversations en attente d'input (slot filling actif) */
  async getWaiting(
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Conversation>> {
    const qs = buildQueryString({ status: 'PENDING' as never }, pagination);
    return fetcher(`${BASE}/conversations/waiting${qs}`);
  },

  /** Historique d'un utilisateur */
  async getByUser(
    userId: string,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Conversation>> {
    const qs = buildQueryString({ userId }, pagination);
    return fetcher(`${BASE}/conversations${qs}`);
  },
};

// =========================================================
// 3. MÉTRIQUES
// =========================================================

export const MetricsService = {
  /** Dashboard métriques globales */
  async getSummary(
    dateFrom?: string,
    dateTo?: string
  ): Promise<AgentMetricsSummary> {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const qs = params.toString();
    return fetcher(`${BASE}/metrics${qs ? `?${qs}` : ''}`);
  },

  /** Santé de chaque agent */
  async getAgentHealth(): Promise<AgentHealthStatus[]> {
    return fetcher(`${BASE}/metrics/health`);
  },

  /** Métriques par agent spécifique */
  async getByAgent(agentName: string): Promise<AgentHealthStatus> {
    return fetcher(`${BASE}/metrics/health/${encodeURIComponent(agentName)}`);
  },
};

// =========================================================
// 4. VUES ROLE-BASED (endpoints optimisés)
// =========================================================

export const MonitoringViewService = {
  /** Vue admin complète */
  async getAdminView(): Promise<AdminMonitoringView> {
    return fetcher(`${BASE}/views/admin`);
  },

  /** Vue producteur */
  async getProducerView(): Promise<ProducerMonitoringView> {
    return fetcher(`${BASE}/views/producer`);
  },

  /** Vue acheteur */
  async getBuyerView(): Promise<BuyerMonitoringView> {
    return fetcher(`${BASE}/views/buyer`);
  },
};

// =========================================================
// 5. SERVER-SENT EVENTS (temps réel)
// =========================================================
