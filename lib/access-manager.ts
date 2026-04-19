/**
 * ACCESS MANAGER — AgriConnect v3 (Drizzle)
 * ──────────────────────────────────────────────────────────────────────────
 * Point d'entrée UNIQUE pour toute vérification de permission dans l'app.
 *
 * ⚠️  Règle d'or : AUCUNE logique de permission ailleurs
 *     (ni dans les controllers, ni dans les services, ni côté frontend).
 *
 * Pattern fluent :
 *
 *   AccessManager.can(ctx)
 *     .permission(PERMISSIONS.STOCK_EDIT)
 *     .inOrg(orgId)
 *     .inZone(zoneId)
 *     .assert()   // lève AccessDeniedError si refusé
 *
 *   // — ou —
 *
 *   const allowed = AccessManager.can(ctx)
 *     .permission(PERMISSIONS.PRODUCER_CREATE)
 *     .check()    // retourne boolean
 *
 * Filtres Drizzle sûrs (Zero-Trust multi-tenant) :
 *
 *   AccessManager.orgFilter(ctx)  // { organizationId: inArray(ctx.organizationIds) }
 *   AccessManager.zoneFilter(ctx) // { zoneId: inArray([...ctx.managedZoneIds]) }
 */

import type { AccessContext } from '@/lib/access-context';
import type { Permission } from '@/lib/permissions';
import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// ERREUR DÉDIÉE
// ─────────────────────────────────────────────────────────────────────────────

export class AccessDeniedError extends Error {
  readonly status = 403;
  constructor(message = 'Accès refusé.') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FLUENT CHECK BUILDER
// ─────────────────────────────────────────────────────────────────────────────

class AccessCheck {
  private readonly ctx: AccessContext;
  private _permission?: Permission;
  private _orgId?: string;
  private _zoneId?: string;
  private _denyMessage?: string;

  constructor(ctx: AccessContext) {
    this.ctx = ctx;
  }

  /** Permission à vérifier (ex. PERMISSIONS.STOCK_EDIT) */
  permission(p: Permission): this {
    this._permission = p;
    return this;
  }

  /** Restreindre la vérification à une organisation spécifique */
  inOrg(orgId: string): this {
    this._orgId = orgId;
    return this;
  }

  /** Restreindre la vérification à une zone spécifique */
  inZone(zoneId: string): this {
    this._zoneId = zoneId;
    return this;
  }

  /** Message personnalisé pour AccessDeniedError */
  withMessage(msg: string): this {
    this._denyMessage = msg;
    return this;
  }

  /**
   * Retourne `true` si l'accès est accordé, `false` sinon.
   * N'entraîne aucun effet de bord.
   */
  check(): boolean {
    const { ctx } = this;

    // ── SUPERADMIN / ADMIN → bypass total ──────────────────────────────────
    if (ctx.isGlobalAdmin) return true;

    // ── Vérification portée organisation ──────────────────────────────────
    // Ne jamais faire confiance au client : on recalcule côté serveur.
    if (this._orgId && !ctx.organizationIds.includes(this._orgId)) {
      return false;
    }

    // ── Vérification portée zone (uniquement si l'utilisateur a des zones) ─
    // Un utilisateur sans zone managée n'a pas de restriction géographique.
    if (this._zoneId && ctx.managedZoneIds.size > 0) {
      if (!ctx.managedZoneIds.has(this._zoneId)) return false;
    }

    // ── Vérification permission ────────────────────────────────────────────
    if (this._permission && !ctx.permissions.has(this._permission)) {
      return false;
    }

    return true;
  }

  /**
   * Lève `AccessDeniedError` si l'accès est refusé.
   * À utiliser dans les services où une assertion est plus propre.
   */
  assert(): void {
    if (!this.check()) {
      throw new AccessDeniedError(this._denyMessage);
    }
  }

  /**
   * Retourne une `NextResponse` 403 prête à être `return`-ée dans une API
   * route, ou `null` si l'accès est accordé.
   */
  toResponse(): NextResponse | null {
    if (this.check()) return null;
    return NextResponse.json(
      { error: this._denyMessage ?? 'Accès refusé.' },
      { status: 403 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS MANAGER (singleton stateless)
// ─────────────────────────────────────────────────────────────────────────────

export const AccessManager = {
  /**
   * Entrée principale. Retourne un builder fluent.
   *
   * @example
   *   AccessManager.can(ctx).permission(PERMISSIONS.ORDER_CANCEL).inOrg(orgId).assert();
   */
  can(ctx: AccessContext): AccessCheck {
    return new AccessCheck(ctx);
  },

  // ── Helpers rapides ──────────────────────────────────────────────────────

  /** Vérifie une permission unique sans builder flush. */
  hasPermission(ctx: AccessContext, permission: Permission): boolean {
    if (ctx.isGlobalAdmin) return true;
    return ctx.permissions.has(permission);
  },

  /** Vérifie que l'utilisateur appartient à l'organisation donnée. */
  belongsToOrg(ctx: AccessContext, orgId: string): boolean {
    if (ctx.isGlobalAdmin) return true;
    return ctx.organizationIds.includes(orgId);
  },

  /** Vérifie que l'utilisateur gère la zone donnée. */
  managesZone(ctx: AccessContext, zoneId: string): boolean {
    if (ctx.isGlobalAdmin) return true;
    if (ctx.managedZoneIds.size === 0) return true; // pas de restriction
    return ctx.managedZoneIds.has(zoneId);
  },

  // ── Filtres Drizzle "Zero-Trust" ────────────────────────────────────────

  /**
   * Retourne une condition Drizzle restreignant par organisation.
   * OBLIGATOIRE sur toute query multi-tenant (ne jamais faire select() sans filtre).
   *
   * @param ctx  - AccessContext de l'utilisateur
   * @param col  - Colonne Drizzle (ex: schema.products.organizationId)
   * @returns    SQL condition ou undefined (admin global)
   *
   * @example
   *   import { schema } from '@/src/db';
   *   db.select().from(schema.products).where(
   *     and(AccessManager.orgFilter(ctx, schema.products.organizationId), eq(schema.products.status, 'ACTIVE'))
   *   );
   */
  orgFilter(
    ctx: AccessContext,
    col: any
  ): any {
    const { eq, inArray } = require('drizzle-orm');
    if (ctx.isGlobalAdmin) return undefined;
    if (ctx.organizationIds.length === 0) {
      // Aucune org → ne retourner aucune donnée (sécurité par défaut)
      return eq(col, '__NO_ORG__');
    }
    if (ctx.organizationIds.length === 1) {
      return eq(col, ctx.organizationIds[0]);
    }
    return inArray(col, ctx.organizationIds);
  },

  /**
   * Retourne une condition Drizzle restreignant par zone.
   * Si l'utilisateur n'a aucune zone managée, retourne undefined (pas de restriction).
   *
   * @param ctx  - AccessContext de l'utilisateur
   * @param col  - Colonne Drizzle (ex: schema.orders.zoneId)
   * @returns    SQL condition ou undefined
   */
  zoneFilter(
    ctx: AccessContext,
    col: any
  ): any {
    const { eq, inArray } = require('drizzle-orm');
    if (ctx.isGlobalAdmin) return undefined;
    if (ctx.managedZoneIds.size === 0) return undefined;
    const ids = Array.from(ctx.managedZoneIds);
    if (ids.length === 1) return eq(col, ids[0]);
    return inArray(col, ids);
  },

  /**
   * Condition Drizzle combinée org + zone. Raccourci pour les queries courantes.
   *
   * @example
   *   db.select().from(schema.products).where(
   *     AccessManager.scopeFilter(ctx, schema.products.organizationId, schema.products.zoneId)
   *   );
   */
  scopeFilter(
    ctx: AccessContext,
    orgCol: any,
    zoneCol: any
  ): any {
    const { and } = require('drizzle-orm');
    const orgCond = AccessManager.orgFilter(ctx, orgCol);
    const zoneCond = AccessManager.zoneFilter(ctx, zoneCol);
    if (orgCond && zoneCond) return and(orgCond, zoneCond);
    return orgCond || zoneCond || undefined;
  },
} as const;
