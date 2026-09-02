import { describe, it, expect, vi, beforeEach } from 'vitest';

// Seuil minimum de commande par TYPE de produit (2026-09-02) — teste la
// couche service (`dr-governance.service.ts::updateSubCategoryMinimum` +
// `getCategories()` passthrough) avec `@/src/db` mocké : ADMIN uniquement,
// 0/négatif rejetés, unité requise dès qu'une quantité est fournie,
// `null` efface le seuil (retour au comportement historique).

const state = {
  user: { id: 'admin-1', role: 'ADMIN' as string },
  subCategory: {
    id: 'sub-1',
    categoryId: 'cat-1',
    name: 'Tomates',
    minimumOrderQuantity: null as string | null,
    minimumOrderUnit: null as string | null,
  },
};

vi.mock('@/lib/get-userId', () => ({
  default: vi.fn(async () => state.user.id),
}));

vi.mock('@/lib/audit', () => ({
  audit: vi.fn(async () => {}),
}));

vi.mock('@/src/db', () => {
  const db = {
    query: {
      users: {
        findFirst: vi.fn(async () => ({ role: state.user.role })),
      },
      subCategories: {
        findFirst: vi.fn(async () => ({ ...state.subCategory })),
      },
    },
    update: vi.fn(() => ({
      set: (values: any) => ({
        where: () => ({
          returning: async () => {
            Object.assign(state.subCategory, values);
            return [{ ...state.subCategory }];
          },
        }),
      }),
    })),
  };
  return { db };
});

import { updateSubCategoryMinimum } from '@/services/dr-governance.service';

beforeEach(() => {
  state.user.role = 'ADMIN';
  state.subCategory.minimumOrderQuantity = null;
  state.subCategory.minimumOrderUnit = null;
});

describe('updateSubCategoryMinimum', () => {
  it('sets a valid minimum', async () => {
    const res = await updateSubCategoryMinimum({
      subCategoryId: 'sub-1', minimumOrderQuantity: 50, minimumOrderUnit: 'KG',
    });
    expect(res.success).toBe(true);
    expect(state.subCategory.minimumOrderQuantity).toBe('50');
    expect(state.subCategory.minimumOrderUnit).toBe('KG');
  });

  it('rejects zero', async () => {
    const res = await updateSubCategoryMinimum({
      subCategoryId: 'sub-1', minimumOrderQuantity: 0, minimumOrderUnit: 'KG',
    });
    expect(res.success).toBe(false);
    expect(state.subCategory.minimumOrderQuantity).toBeNull();
  });

  it('rejects a negative value', async () => {
    const res = await updateSubCategoryMinimum({
      subCategoryId: 'sub-1', minimumOrderQuantity: -5, minimumOrderUnit: 'KG',
    });
    expect(res.success).toBe(false);
  });

  it('requires a unit when a quantity is given', async () => {
    const res = await updateSubCategoryMinimum({
      subCategoryId: 'sub-1', minimumOrderQuantity: 50,
    } as any);
    expect(res.success).toBe(false);
  });

  it('clears the threshold when quantity is null (back to historical behaviour)', async () => {
    state.subCategory.minimumOrderQuantity = '50';
    state.subCategory.minimumOrderUnit = 'KG';
    const res = await updateSubCategoryMinimum({
      subCategoryId: 'sub-1', minimumOrderQuantity: null,
    });
    expect(res.success).toBe(true);
    expect(state.subCategory.minimumOrderQuantity).toBeNull();
    expect(state.subCategory.minimumOrderUnit).toBeNull();
  });

  it('is refused for a non-admin caller (producer cannot set the threshold)', async () => {
    state.user.role = 'PRODUCER';
    const res = await updateSubCategoryMinimum({
      subCategoryId: 'sub-1', minimumOrderQuantity: 50, minimumOrderUnit: 'KG',
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/administrateurs/i);
  });

  it('is refused for a SALES_MANAGER / non-platform-admin org role', async () => {
    state.user.role = 'ZONE_MANAGER';
    const res = await updateSubCategoryMinimum({
      subCategoryId: 'sub-1', minimumOrderQuantity: 50, minimumOrderUnit: 'KG',
    });
    expect(res.success).toBe(false);
  });
});
