/**
 * Order Policy — minimum order quantity per PRODUCT TYPE (2026-09-02).
 *
 * Mirror of the agent's `domain/order_policy.py::validate_minimum_order_quantity`
 * (AgriConnect backend). Same rule, same source of truth (the shared
 * `governance.sub_categories` table — see `src/db/schema/governance.ts`):
 * this is a PLATFORM policy configured by the admin at the product-TYPE
 * level, never a per-product/producer setting, never derived from price.
 *
 * `total_quantity` must already be the quantity actually being ordered
 * (e.g. cart line quantity for this product) — never a package count or any
 * other intermediate value.
 */

import { convertQuantity, normalizeUnit } from '@/lib/quantityUnit';

export type MinimumOrderReason = 'NO_RULE' | 'OK' | 'BELOW_MINIMUM' | 'UNIT_INCOMPATIBLE';

export interface MinimumOrderCheck {
  passed: boolean;
  reason: MinimumOrderReason;
  minimumQuantity?: number;
  minimumUnit?: string;
  /** The minimum converted into `totalUnit` — only when a safe conversion exists. */
  minimumInTotalUnit?: number;
}

export function validateMinimumOrderQuantity(params: {
  minimumOrderQuantity: number | string | null | undefined;
  minimumOrderUnit: string | null | undefined;
  totalQuantity: number;
  totalUnit: string;
}): MinimumOrderCheck {
  const { minimumOrderQuantity, minimumOrderUnit, totalQuantity, totalUnit } = params;

  if (minimumOrderQuantity === null || minimumOrderQuantity === undefined) {
    return { passed: true, reason: 'NO_RULE' };
  }
  const minimum = Number(minimumOrderQuantity);
  if (!Number.isFinite(minimum) || minimum <= 0) {
    // Défensif : l'écriture admin interdit déjà 0/négatif — une donnée
    // corrompue ne doit jamais bloquer TOUTE commande de ce type de produit.
    return { passed: true, reason: 'NO_RULE' };
  }

  const minUnit = normalizeUnit(minimumOrderUnit);
  const orderUnit = normalizeUnit(totalUnit);
  const minimumInTotalUnit = convertQuantity(minimum, minUnit, orderUnit);

  if (minimumInTotalUnit === null) {
    return { passed: false, reason: 'UNIT_INCOMPATIBLE', minimumQuantity: minimum, minimumUnit: minUnit };
  }

  if (totalQuantity + 1e-9 < minimumInTotalUnit) {
    return {
      passed: false,
      reason: 'BELOW_MINIMUM',
      minimumQuantity: minimum,
      minimumUnit: minUnit,
      minimumInTotalUnit,
    };
  }

  return {
    passed: true,
    reason: 'OK',
    minimumQuantity: minimum,
    minimumUnit: minUnit,
    minimumInTotalUnit,
  };
}
