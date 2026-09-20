// ─── Permission groups for the multi-select UI ──────────────────────────────
export const PERMISSION_GROUPS: Record<string, string[]> = {
  'Territoires & Zones': ['ZONE_VIEW', 'ZONE_MANAGE', 'LOCATION_VIEW', 'LOCATION_EDIT', 'LOCATION_DELETE'],
  'Stocks & Inventaire': ['STOCK_VIEW', 'STOCK_EDIT', 'STOCK_DELETE', 'STOCK_VERIFY'],
  'Commandes': ['ORDER_VIEW', 'ORDER_CREATE', 'ORDER_VALIDATE', 'ORDER_CANCEL'],
  'Produits': ['PRODUCT_VIEW', 'PRODUCT_EDIT', 'PRODUCT_DELETE', 'PRODUCT_VERIFY'],
  'Utilisateurs': ['USER_VIEW', 'USER_EDIT', 'USER_BAN', 'ROLE_MANAGE'],
  'Producteurs': ['PRODUCER_VIEW', 'PRODUCER_CREATE', 'PRODUCER_VALIDATE', 'PRODUCER_SUSPEND', 'PRODUCER_DELETE'],
  'Organisation': ['ORG_VIEW', 'ORG_MANAGE', 'ORG_INVITE'],
  'Monitoring & Agents': ['MONITORING_VIEW', 'AGENT_APPROVE', 'AGENT_TELEMETRY_VIEW'],
  'Entrepôts & Lots': ['WAREHOUSE_VIEW', 'WAREHOUSE_EDIT', 'BATCH_VIEW', 'BATCH_EDIT'],
  'Finance & KPIs': ['FINANCE_VIEW', 'FORECAST_VIEW', 'ZONE_METRIC_VIEW'],
  'Audit': ['AUDIT_VIEW'],
};

export interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  membersCount: number;
  createdAt: string;
}
