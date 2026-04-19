/**
 * INFERRED TYPES — Source de vérité depuis le schema Drizzle
 * ══════════════════════════════════════════════════════════════════════════
 * Tous les types liés aux entités DB doivent être issus d'ici.
 * Ne JAMAIS redéfinir manuellement un type qui existe déjà comme table.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────
export type { User, Account, Session } from '@/src/db/schema/auth';

// ─── Governance ──────────────────────────────────────────────────────────────
export type {
  Organization,
  UserOrganization,
  RoleDef,
  Zone,
  SubCategory,
  StandardPrice,
} from '@/src/db/schema/governance';

// ─── Marketplace ─────────────────────────────────────────────────────────────
export type {
  Producer,
  Product,
  Order,
  OrderItem,
  Warehouse,
} from '@/src/db/schema/marketplace';

// ─── Inventory (Seeds) ──────────────────────────────────────────────────────
export type {
  SeedAllocation,
  SeedDistribution,
  SeedDistributionAttempt,
} from '@/src/db/schema/inventory';

// ─── Rôles système ──────────────────────────────────────────────────────────
export type SystemRole = 'USER' | 'BUYER' | 'PRODUCER' | 'ADMIN' | 'SUPERADMIN' | 'AGENT';

// ─── Statuts réutilisés côté client ─────────────────────────────────────────
export type OrderStatus =
  | 'PENDING'
  | 'STOCK_RESERVED'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'FAILED';
