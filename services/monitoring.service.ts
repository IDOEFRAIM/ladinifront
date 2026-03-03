// services/monitoring.service.ts
// =========================================================
// SERVICE DE MONITORING DES AGENTS MCP/A2A
// Couche client pour accéder aux APIs de monitoring
// Supporte : pagination cursor, filtres, SSE, bulk ops
// =========================================================

import type {
  AgentAction,
  Conversation,
  AgentMetricsSummary,
  MonitoringFilters,
  PaginationParams,
  PaginatedResponse,
  ApprovalPayload,
  BulkApprovalPayload,
  AdminMonitoringView,
  ProducerMonitoringView,
  BuyerMonitoringView,
  AgentHealthStatus,
  MonitoringEvent,
} from '@/types/monitoring';

import axios from 'axios';

const BASE = '/api/monitoring';

// --- Utilitaires ---

function buildQueryString(
  filters?: MonitoringFilters,
  pagination?: PaginationParams
): string {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
  }

  if (pagination) {
    if (pagination.cursor) params.set('cursor', pagination.cursor);
    if (pagination.limit) params.set('limit', String(pagination.limit));
    if (pagination.sortBy) params.set('sortBy', pagination.sortBy);
    if (pagination.sortOrder) params.set('sortOrder', pagination.sortOrder);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function fetcher<T>(url: string, options?: any): Promise<T> {
  try {
    const method = (options && options.method) || 'get';
    const axiosOptions: any = {
      url,
      method: method.toLowerCase(),
      headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
    };

    if (options && options.body) {
      axiosOptions.data = options.body;
    }

    const res = await axios(axiosOptions);
    return res.data as T;
  } catch (err: any) {
    const message = err?.response?.data?.message || err.message || 'HTTP Error';
    throw new Error(message);
  }
}

// =========================================================
// 1. AGENT ACTIONS
// =========================================================

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

export class MonitoringSSE {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(event: MonitoringEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Se connecter au stream SSE */
  connect(role?: string): void {
    if (this.eventSource) this.disconnect();

    const params = role ? `?role=${role}` : '';
    this.eventSource = new EventSource(`${BASE}/stream${params}`);

    this.eventSource.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.eventSource.onmessage = (event) => {
      try {
        const parsed: MonitoringEvent = JSON.parse(event.data);
        this.dispatch(parsed.type, parsed);
        this.dispatch('*', parsed); // Wildcard
      } catch (err) {
        console.error('[MonitoringSSE] Parse error:', err);
      }
    };

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      this.eventSource = null;
      this.tryReconnect(role);
    };
  }

  /** Déconnecter */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.eventSource?.close();
    this.eventSource = null;
    this.reconnectAttempts = 0;
  }

  /** Écouter un type d'événement */
  on(type: string, callback: (event: MonitoringEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /** Statut de la connexion */
  get isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  private dispatch(type: string, event: MonitoringEvent): void {
    this.listeners.get(type)?.forEach((cb) => cb(event));
  }

  private tryReconnect(role?: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[MonitoringSSE] Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect(role);
    }, Math.min(delay, 30000)); // Cap at 30s
  }
}

/** Singleton SSE instance */
export const monitoringSSE = new MonitoringSSE();
