'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCategories, getStandardPrices } from '@/services/dr-governance.service';
import { useZone } from '@/context/ZoneContext';
import type { Category, PriceInfo, StandardPriceMap } from '@/types/product-flow';

/**
 * Charge et expose les métadonnées catalogue (catégories filtrées par zone,
 * carte des prix standards, lookup de prix par sous-catégorie).
 */
export function useProductMetadata() {
  const { zoneId } = useZone();
  const [categories, setCategories] = useState<Category[]>([]);
  const [standardPriceMap, setStandardPriceMap] = useState<StandardPriceMap>({});
  const [loading, setLoading] = useState(true);

  // ── Chargement des catégories (filtrage zone) ──────────────────────
  useEffect(() => {
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const res = await getCategories();
        if (!alive || !res?.success || !Array.isArray(res.data)) return;

        const filtered: Category[] = res.data
          .map((c: Category) => ({
            ...c,
            subCategories: (c.subCategories ?? []).filter(
              (s) => !zoneId || !s.blockedZoneIds?.includes(zoneId),
            ),
          }))
          .filter((c: Category) => c.subCategories.length > 0);

        setCategories(filtered);
      } catch (e) {
        console.error('[useProductMetadata] Failed to load categories', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [zoneId]);

  // ── Chargement de la carte des prix standards ──────────────────────
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!zoneId) { setStandardPriceMap({}); return; }
      try {
        const resp = await getStandardPrices(zoneId);
        if (!alive || !resp?.success || !Array.isArray(resp.data)) return;

        const map: StandardPriceMap = {};
        for (const p of resp.data) {
          const key = String((p as any).subCategoryId ?? (p as any).subCategory?.id ?? '');
          const price = Number((p as any).pricePerUnit ?? (p as any).price_per_unit ?? (p as any).price ?? NaN);
          if (key && !Number.isNaN(price)) {
            map[key] = { price, unit: (p as any).unit };
          }
        }
        setStandardPriceMap(map);
      } catch (e) {
        console.error('[useProductMetadata] Failed to load standard prices', e);
      }
    })();

    return () => { alive = false; };
  }, [zoneId, categories]);

  // ── Lookup du prix standard pour une sous-catégorie ────────────────
  const getPriceForSubCategory = useCallback(
    (subCategoryId: string | undefined): PriceInfo | null => {
      if (!subCategoryId) return null;
      const key = String(subCategoryId);
      if (standardPriceMap[key]) return standardPriceMap[key];

      // Fallback : chercher dans les standardPrices embarquées des sous-catégories
      for (const cat of categories) {
        const sub = cat.subCategories.find((s) => String(s.id) === key);
        if (!sub) continue;
        const match = sub.standardPrices.find(
          (sp) => String(sp.zone?.id) === String(zoneId),
        );
        if (match) return { price: Number(match.pricePerUnit), unit: match.unit };
        if (sub.standardPrices.length > 0) {
          const first = sub.standardPrices[0];
          return { price: Number(first.pricePerUnit), unit: first.unit };
        }
      }
      return null;
    },
    [standardPriceMap, categories, zoneId],
  );

  // ── Résolution parent → sous-catégorie pour mode edit ──────────────
  const findParentCategory = useCallback(
    (subCategoryId: string): { parent: Category; sub: Category['subCategories'][number] } | null => {
      for (const cat of categories) {
        const sub = cat.subCategories.find((s) => String(s.id) === String(subCategoryId));
        if (sub) return { parent: cat, sub };
      }
      return null;
    },
    [categories],
  );

  const getSubCategories = useCallback(
    (categoryId: string | null) =>
      categories.find((c) => String(c.id) === categoryId)?.subCategories ?? [],
    [categories],
  );

  return {
    zoneId,
    categories,
    standardPriceMap,
    loading,
    getPriceForSubCategory,
    findParentCategory,
    getSubCategories,
  };
}
