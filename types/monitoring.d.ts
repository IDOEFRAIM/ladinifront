// types/monitoring.d.ts
// =========================================================
// TYPES POUR LE MONITORING DES AGENTS MCP/A2A
// Alignés sur le schema Prisma (AgentAction, Conversation, ExternalContext)
// =========================================================

// --- ENUMS (miroirs Prisma) ---

export type AgentActionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'FAILED';

export type ValidationPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type ConversationMode = 'text' | 'voice' | 'sms';

export type AgentType =
  | 'sentinel'
  | 'doctor'
  | 'market'
  | 'formation'
  | string; // Extensible pour de futurs agents

// --- 1. AGENT ACTIONS (table agent_actions) ---

export interface AgentActionPayload {
  amount?: number;
  item?: string;
  quantity?: number;
  unit?: string;
  targetLocation?: string;
  [key: string]: unknown; // Flexible pour différents types d'actions
}

export interface AgentAction {
  id: string;
  agentName: string;
  actionType: string;
  payload: AgentActionPayload;
  status: AgentActionStatus;
  priority: ValidationPriority;

  orderId?: string | null;
  userId?: string | null;

  auditTrailId?: string | null;
  aiReasoning?: string | null;
  adminNotes?: string | null;
  validatedById?: string | null;

  createdAt: string;
  updatedAt: string;

  // Relations (populées côté API)
  order?: {
    id: string;
    totalAmount: number;
    status: string;
    customerName?: string;
  } | null;

  user?: {
    id: string;
    name?: string;
    role: string;
  } | null;
}

// --- 2. CONVERSATIONS (table conversations) ---

export interface ConversationSlot {
  name: string;
  filled: boolean;
  value?: string;
}

export interface ExecutionPathStep {
  agent: string;
  action?: string;
  durationMs?: number;
  status?: 'success' | 'error' | 'skipped';
}

export interface Conversation {
  id: string;
  userId: string;
  query: string;
  response?: string | null;

  agentType?: AgentType | null;
  crop?: string | null;
  locationId?: string | null;
  mode: ConversationMode;
  audioUrl?: string | null;

  // Slot filling
  isWaitingForInput: boolean;
  missingSlots?: string[] | null;

  // Monitoring
  executionPath?: ExecutionPathStep[] | null;
  confidenceScore?: number | null;

  // Performance
  totalTokensUsed: number;
  responseTimeMs?: number | null;

  auditTrailId?: string | null;

  createdAt: string;
  updatedAt: string;

  // Relations (populées côté API)
  user?: {
    id: string;
    name?: string;
    role: string;
  } | null;
  location?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

// --- 3. MÉTRIQUES AGRÉGÉES ---

export interface AgentMetricsSummary {
  totalActions: number;
  pendingActions: number;
  approvedActions: number;
  rejectedActions: number;
  executedActions: number;
  failedActions: number;

  totalConversations: number;
  activeConversations: number; // isWaitingForInput = true

  avgConfidenceScore: number;
  avgResponseTimeMs: number;
  totalTokensUsed: number;

  actionsByAgent: Record<string, number>;
  conversationsByAgent: Record<string, number>;

  // Pour les graphiques temporels
  actionsOverTime: TimeSeriesPoint[];
  conversationsOverTime: TimeSeriesPoint[];
  tokensOverTime: TimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  timestamp: string; // ISO date
  value: number;
  label?: string;
}

// --- 4. FILTRES & PAGINATION ---

export interface MonitoringFilters {
  agentName?: string;
  actionType?: string;
  status?: AgentActionStatus;
  priority?: ValidationPriority;
  agentType?: AgentType;
  userId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginationParams {
  cursor?: string;      // Cursor-based pour la scalabilité
  limit?: number;       // Default 20
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string | null;
  totalCount: number;
  hasMore: boolean;
}

// --- 5. EVENTS SSE (Server-Sent Events) ---

export type MonitoringEventType =
  | 'agent:action:created'
  | 'agent:action:updated'
  | 'agent:action:approved'
  | 'agent:action:rejected'
  | 'conversation:new'
  | 'conversation:response'
  | 'conversation:waiting'
  | 'metrics:updated'
  | 'heartbeat';

export interface MonitoringEvent<T = unknown> {
  type: MonitoringEventType;
  data: T;
  timestamp: string;
  agentName?: string;
}

// --- 6. APPROVAL / VALIDATION ---

export interface ApprovalPayload {
  actionId: string;
  decision: 'APPROVED' | 'REJECTED';
  adminNotes?: string;
}

export interface BulkApprovalPayload {
  actionIds: string[];
  decision: 'APPROVED' | 'REJECTED';
  adminNotes?: string;
}

// --- 7. VUES ROLE-BASED ---

/** Vue Admin : tout voir, tout contrôler */
export interface AdminMonitoringView {
  metrics: AgentMetricsSummary;
  pendingActions: AgentAction[];
  recentConversations: Conversation[];
  agentHealth: AgentHealthStatus[];
}

/** Vue Producteur : voir les actions liées à son compte */
export interface ProducerMonitoringView {
  myActions: AgentAction[];
  myConversations: Conversation[];
  agentSuggestions: AgentAction[];
  performanceMetrics: {
    totalInteractions: number;
    avgResponseTime: number;
    topAgentUsed: string;
  };
}

/** Vue Acheteur : historique conversations, statut commandes agents */
export interface BuyerMonitoringView {
  conversations: Conversation[];
  agentOrders: AgentAction[];
  waitingForInput: Conversation[];
}

// --- 8. SANTÉ DES AGENTS ---

export type AgentHealthLevel = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface AgentHealthStatus {
  agentName: string;
  status: AgentHealthLevel;
  lastActivityAt?: string;
  actionsLast24h: number;
  errorRate: number; // 0-1
  avgResponseTimeMs: number;
  uptime?: number; // percentage
}

// --- 9. EXTERNAL CONTEXT (table external_context_files) ---

export interface ExternalContext {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'xlsx' | 'csv' | string;
  fileUrl: string;
  category?: string | null;
  locationId?: string | null;
  isVectorized: boolean;
  mcpServerId?: string | null;
  createdAt: string;

  location?: {
    id: string;
    name: string;
  } | null;
}
