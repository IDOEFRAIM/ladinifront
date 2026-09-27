import { describe, it, expect } from 'vitest';
import { validateMinimumOrderQuantity } from '@/lib/orderPolicy';

// Seuil minimum de commande par TYPE de produit (2026-09-02) — mirror of the
// agent's domain/order_policy.py tests. Covers the acceptance scenarios from
// the feature brief (§35): flat pricing below/at/above threshold, unit
// conversion, unit incompatibility, and NULL = historical behaviour.

describe('validateMinimumOrderQuantity', () => {
  it('treats a NULL minimum as no rule (historical behaviour)', () => {
    const result = validateMinimumOrderQuantity({
      minimumOrderQuantity: null,
      minimumOrderUnit: null,
      totalQuantity: 1,
      totalUnit: 'KG',
    });
    expect(result.passed).toBe(true);
    expect(result.reason).toBe('NO_RULE');
  });

  it('rejects an order below the minimum', () => {
    const result = validateMinimumOrderQuantity({
      minimumOrderQuantity: 50,
      minimumOrderUnit: 'KG',
      totalQuantity: 30,
      totalUnit: 'KG',
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('BELOW_MINIMUM');
    expect(result.minimumInTotalUnit).toBe(50);
  });

  it('accepts an order exactly at the minimum', () => {
    const result = validateMinimumOrderQuantity({
      minimumOrderQuantity: 50,
      minimumOrderUnit: 'KG',
      totalQuantity: 50,
      totalUnit: 'KG',
    });
    expect(result.passed).toBe(true);
    expect(result.reason).toBe('OK');
  });

  it('accepts an order above the minimum', () => {
    const result = validateMinimumOrderQuantity({
      minimumOrderQuantity: 50,
      minimumOrderUnit: 'KG',
      totalQuantity: 60,
      totalUnit: 'KG',
    });
    expect(result.passed).toBe(true);
  });

  it('converts units through the shared engine (KG <-> TONNE)', () => {
    const result = validateMinimumOrderQuantity({
      minimumOrderQuantity: 50,
      minimumOrderUnit: 'KG',
      totalQuantity: 0.03,
      totalUnit: 'TONNE',
    });
    expect(result.passed).toBe(false);
    expect(result.minimumInTotalUnit).toBe(0.05);
  });

  it('never guesses across incompatible unit families', () => {
    const result = validateMinimumOrderQuantity({
      minimumOrderQuantity: 50,
      minimumOrderUnit: 'KG',
      totalQuantity: 3,
      totalUnit: 'BAG',
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('UNIT_INCOMPATIBLE');
    expect(result.minimumInTotalUnit).toBeUndefined();
  });

  it('treats a corrupted zero/negative minimum as no rule (defensive)', () => {
    expect(validateMinimumOrderQuantity({
      minimumOrderQuantity: 0, minimumOrderUnit: 'KG', totalQuantity: 1, totalUnit: 'KG',
    }).passed).toBe(true);
    expect(validateMinimumOrderQuantity({
      minimumOrderQuantity: -5, minimumOrderUnit: 'KG', totalQuantity: 1, totalUnit: 'KG',
    }).passed).toBe(true);
  });

  it('accepts a stringified numeric minimum (drizzle numeric columns read back as strings)', () => {
    const result = validateMinimumOrderQuantity({
      minimumOrderQuantity: '50.000',
      minimumOrderUnit: 'KG',
      totalQuantity: 30,
      totalUnit: 'KG',
    });
    expect(result.passed).toBe(false);
    expect(result.minimumInTotalUnit).toBe(50);
  });
});
