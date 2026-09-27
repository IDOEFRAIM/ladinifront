// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── faux client Drizzle : on trace quelles écritures passent par la transaction ────────────────────────────
const log: string[] = [];
const failSecondUpdate = { value: false };

function updateChain(tag: string, rows: unknown[]) {
  const c: Record<string, unknown> = {};
  c.set = () => c;
  c.where = () => c;
  c.returning = async () => { log.push(`${tag}:returning`); return rows; };
  c.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
    log.push(`${tag}:exec`);
    if (tag.endsWith('users') && failSecondUpdate.value) return Promise.reject(new Error('boom-2nd-write')).then(resolve, reject);
    return Promise.resolve(rows).then(resolve, reject);
  };
  return c;
}

const profileRow = { id: 'bp1', user: { id: 'u1', cnibNumber: '123', identityVerified: false }, buyerType: { id: 't', name: 'Particulier' } };

const txUpdate = vi.fn();
const dbUpdate = vi.fn();
const transaction = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
  log.push('BEGIN');
  try {
    const out = await cb({ update: (t: { __n: string }) => { txUpdate(); return updateChain(`tx.${t.__n}`, [{ id: 'bp1' }]); } });
    log.push('COMMIT');
    return out;
  } catch (e) {
    log.push('ROLLBACK');
    throw e;
  }
});

const productFindFirst = vi.fn();
const productUpdateReturning = vi.fn();
vi.mock('@/src/db', () => ({
  db: {
    query: { buyerProfiles: { findFirst: async () => profileRow }, products: { findFirst: (...a: unknown[]) => productFindFirst(...a) } },
    update: (...a: unknown[]) => {
      dbUpdate(...a);
      const c: Record<string, unknown> = {};
      c.set = () => c; c.where = () => c; c.returning = () => productUpdateReturning();
      return c;
    },
    transaction: (cb: (tx: unknown) => Promise<unknown>) => transaction(cb),
  },
  schema: {},
}));
vi.mock('@/src/db/schema', () => ({
  buyerProfiles: { __n: 'buyerProfiles', id: 'id' }, users: { __n: 'users', id: 'id' },
  products: { id: 'id', updatedAt: 'updated_at', producerId: 'p' },
}));
vi.mock('drizzle-orm', () => ({ eq: () => ({}), and: () => ({}), sql: () => ({}) }));
vi.mock('@/lib/audit', () => ({ audit: async () => undefined }));
vi.mock('@/features/products/services/product-form-parse', () => ({
  validateProductFormData: async () => ({ data: {} }),
  validateProductUpdateFormData: async () => ({ name: 'x', price: 5 }),
}));
vi.mock('@/features/products/services/product-media', () => ({
  processProductImages: async () => [], processProductAudio: async () => null,
  updateProductImages: async () => [], updateProductAudio: async () => null,
}));

beforeEach(() => { log.length = 0; failSecondUpdate.value = false; txUpdate.mockClear(); dbUpdate.mockClear(); });

describe('transactions', () => {
  it('verifyBuyerProfile : les 2 écritures passent par UNE transaction, COMMIT complet', async () => {
    const { verifyBuyerProfile } = await import('@/features/buyer/services/buyerVerification.service');
    const res = await verifyBuyerProfile({ buyerProfileId: 'bp1', adminUserId: 'a1', verificationType: 'CNIB' });
    expect(res.success).toBe(true);
    expect(txUpdate).toHaveBeenCalledTimes(2);
    expect(dbUpdate).not.toHaveBeenCalled(); // plus d'écriture hors transaction
    expect(log).toContain('COMMIT');
    expect(log).not.toContain('ROLLBACK');
  });

  it('2e écriture en échec → ROLLBACK, l\'erreur remonte (pas de demi-état)', async () => {
    failSecondUpdate.value = true;
    const { verifyBuyerProfile } = await import('@/features/buyer/services/buyerVerification.service');
    await expect(verifyBuyerProfile({ buyerProfileId: 'bp1', adminUserId: 'a1', verificationType: 'CNIB' })).rejects.toThrow('boom-2nd-write');
    expect(log).toContain('ROLLBACK');
    expect(log).not.toContain('COMMIT');
  });
});

describe('verrouillage optimiste (produit)', () => {
  const form = (expected?: string) => {
    const f = new FormData();
    f.set('id', 'p1');
    if (expected) f.set('expectedUpdatedAt', expected);
    return f;
  };
  beforeEach(() => {
    productFindFirst.mockResolvedValue({ id: 'p1', producerId: 'prod1', images: [], audioUrl: null });
  });

  it('précondition non satisfaite (0 ligne) → OptimisticConflictError (→ 409), pas d\'écrasement silencieux', async () => {
    productUpdateReturning.mockResolvedValue([]);
    const { updateProductFromForm } = await import('@/features/products/services/product-mutations');
    const { OptimisticConflictError, classifyDbError } = await import('@/lib/db-errors');
    const err = await updateProductFromForm(form('2026-01-01T00:00:00.000Z'), 'prod1').catch((e) => e);
    expect(err).toBeInstanceOf(OptimisticConflictError);
    expect(classifyDbError(err).status).toBe(409);
  });

  it('précondition satisfaite → mise à jour normale', async () => {
    productUpdateReturning.mockResolvedValue([{ id: 'p1' }]);
    const { updateProductFromForm } = await import('@/features/products/services/product-mutations');
    await expect(updateProductFromForm(form('2026-01-01T00:00:00.000Z'), 'prod1')).resolves.toEqual({ id: 'p1' });
  });

  it('date de précondition invalide → refus explicite, aucune écriture', async () => {
    const { updateProductFromForm } = await import('@/features/products/services/product-mutations');
    await expect(updateProductFromForm(form('pas-une-date'), 'prod1')).rejects.toMatchObject({ code: 'INVALID_EXPECTED_UPDATED_AT' });
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it('produit d\'un autre producteur → FORBIDDEN', async () => {
    const { updateProductFromForm } = await import('@/features/products/services/product-mutations');
    await expect(updateProductFromForm(form(), 'autre')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
