/**
 * DRIZZLE SCHEMA — AgriConnect v3 (Multi-Schema)
 * ══════════════════════════════════════════════════════════════════════════
 * Architecture :
 *   auth         → Users, Sessions, Accounts
 *   governance   → Zones, Regions, Categories, SubCategories, StandardPrice, Orgs, Roles
 *   marketplace  → Products, Stocks, Orders, Auctions, Bids, Farms, Expenses, Batches
 *   intelligence → TrustScore, AIRatingReasoning, AgentActions, Telemetry, AuditLog, Anomaly
 *
 * Convention :
 *   - UUID v4 pour tous les IDs (meilleur pour l'indexation B-Tree que CUID)
**/
// (governance tables moved to src/db/schema/governance.ts)

// MARKETPLACE SCHEMA (moved to src/db/schema/marketplace.ts)

export * from './auth';
export * from './governance';
export * from './marketplace';
export * from './intelligence';
export * from './relations';

import * as authModule from './auth';
import * as governanceModule from './governance';
import marketplaceTables from './marketplace';
export const {
  warehouses,
  producers,
  clients,
  farms,
  cropCycles,
  stocks,
  stockMovements,
  batches,
  expenses,
  products,
  orders,
  orderItems,
  auctions,
  bids,
} = marketplaceTables;
 
import intelligenceTables from './intelligence';
export const {
  auditLogs,
  agentActions,
  agentTelemetry,
  externalContexts,
  conversations,
  territoryEvents,
  anomalies,
  trustScores,
  aiRatingReasonings,
} = intelligenceTables;

// Composite runtime schema object for callers that expect a single namespace
export const schema = {
  ...authModule,
  ...governanceModule,
  ...marketplaceTables,
  ...intelligenceTables,
};
