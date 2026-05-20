'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Cache de nettoyage des requêtes parallèles ou successives
  const activeRequestsRef = useRef({ zoneId: '' });

  // ── 1. Chargement des catégories ET des prix en parallèle (Ultra-Optimisé) ──
  useEffect(() => {
    let alive = true;
    setLoading(true);
    activeRequestsRef.current.zoneId = zoneId || '';

    (async () => {
      try {
        // En mode Edit, on lance les deux requêtes en même temps pour gagner en fluidité
        const [categoriesResp, pricesResp] = await Promise.all([
          getCategories(),
          zoneId ? getStandardPrices(zoneId) : Promise.resolve({ success: false, data: null })
        ]);

        if (!alive) return;

        // Traitement des Catégories
        let filteredCategories: Category[] = [];
        if (categoriesResp?.success && Array.isArray(categoriesResp.data)) {
          filteredCategories = categoriesResp.data
            .map((c: Category) => ({
              ...c,
              subCategories: (c.subCategories ?? []).filter(
                (s) => !zoneId || !s.blockedZoneIds?.includes(zoneId),
              ),
            }))
            .filter((c: Category) => c.subCategories.length > 0);
          
          setCategories(filteredCategories);
        }

        // Traitement de la Map des Prix (S'exécute de manière découplée)
        const map: StandardPriceMap = {};
        if (pricesResp?.success && Array.isArray(pricesResp.data)) {
          for (const p of pricesResp.data) {
            const key = String((p as any).subCategoryId ?? (p as any).subCategory?.id ?? '');
            const price = Number((p as any).pricePerUnit ?? (p as any).price_per_unit ?? (p as any).price ?? NaN);
            if (key && !Number.isNaN(price)) {
              map[key] = { price, unit: (p as any).unit };
            }
          }
        }
        setStandardPriceMap(map);

      } catch (e) {
        console.error('[useProductMetadata] Failed to load metadata suite', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [zoneId]); // 🏎️ DISPARITION DE 'categories' ! Plus de double requête cyclique.


  // ── 2. Lookup du prix standard pour une sous-catégorie ────────────────
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

  // ── 3. Résolution parent → sous-catégorie sécurisée pour mode edit ──────────────
  const findParentCategory = useCallback(
    (subCategoryId: string | undefined): { parent: Category; sub: Category['subCategories'][number] } | null => {
      if (!subCategoryId) return null;
      const key = String(subCategoryId);
      
      for (const cat of categories) {
        const sub = cat.subCategories.find((s) => String(s.id) === key);
        if (sub) return { parent: cat, sub };
      }
      return null;
    },
    [categories],
  );

  const getSubCategories = useCallback(
    (categoryId: string | null) => {
      if (!categoryId) return [];
      return categories.find((c) => String(c.id) === String(categoryId))?.subCategories ?? [];
    },
    [categories],
  );

  return {
    zoneId,
    categories,
    standardPriceMap,
    loading, // 🟢 Permet à useProductForm d'attendre que TOUT soit prêt avant d'initialiser les champs en Edit
    getPriceForSubCategory,
    findParentCategory,
    getSubCategories,
  };
}