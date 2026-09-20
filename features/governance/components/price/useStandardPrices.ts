'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCategories } from '@/features/governance/actions/categories.actions';
import { getStandardPrices, upsertStandardPrice } from '@/features/governance/actions/standard-prices.actions';
import { asError } from '@/lib/errors';
import type { PriceRow } from '@/features/governance/components/price/price.config';

/** Chargement, édition et enregistrement (ligne / en masse) des prix standards d'une zone. */
export function useStandardPrices(zoneId: string | null | undefined) {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    if (!zoneId) { setRows([]); return; }
    setLoading(true);
    try {
      // Load all categories/subcategories and existing prices for this zone
      const [catResult, priceResult] = await Promise.all([
        getCategories(),
        getStandardPrices(zoneId),
      ]);

      const priceMap = new Map<string, any>();
      if (priceResult.success && priceResult.data) {
        for (const p of priceResult.data) {
          priceMap.set(p.subCategoryId, p);
        }
      }

      if (catResult.success && catResult.data) {
        const newRows: PriceRow[] = [];
        for (const cat of catResult.data) {
          for (const sub of cat.subCategories) {
            const existing = priceMap.get(sub.id);
            newRows.push({
              subCategoryId: sub.id,
              subCategoryName: sub.name,
              categoryName: cat.name,
              currentPrice: existing?.pricePerUnit ?? null,
              currentUnit: existing?.unit || 'KG',
              newPrice: existing?.pricePerUnit != null ? String(existing.pricePerUnit) : '',
              newUnit: existing?.unit || 'KG',
              updatedBy: existing?.updatedBy?.name || existing?.updatedBy?.email || null,
              updatedAt: existing?.updatedAt ? new Date(existing.updatedAt).toLocaleDateString('fr-FR') : null,
            });
          }
        }
        setRows(newRows);
      }
    } catch (e) {
      console.error('Failed to load standard prices', e);
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateRow = (subCategoryId: string, field: 'newPrice' | 'newUnit', value: string) => {
    setRows(prev => prev.map(r => r.subCategoryId === subCategoryId ? { ...r, [field]: value } : r));
  };

  const saveRow = async (row: PriceRow) => {
    if (!zoneId) return;
    const price = parseFloat(row.newPrice);
    if (isNaN(price) || price <= 0) {
      setMessage({ text: `Prix invalide pour ${row.subCategoryName}`, type: 'error' });
      return;
    }

    setSaving(row.subCategoryId);
    setMessage(null);
    try {
      const res = await upsertStandardPrice({
        subCategoryId: row.subCategoryId,
        zoneId,
        pricePerUnit: price,
        unit: row.newUnit as any,
      });
      if (res.success) {
        setMessage({ text: `Prix mis à jour: ${row.subCategoryName} → ${price} FCFA/${row.newUnit}`, type: 'success' });
        loadData();
      } else {
        setMessage({ text: res.error || 'Erreur', type: 'error' });
      }
    } catch (_e: unknown) {
    const e = asError(_e);
      setMessage({ text: e.message || 'Erreur serveur', type: 'error' });
    } finally {
      setSaving(null);
    }
  };

  const saveAll = async () => {
    if (!zoneId) return;
    setBulkSaving(true);
    setMessage(null);
    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      const price = parseFloat(row.newPrice);
      if (isNaN(price) || price <= 0) continue; // skip empty/invalid

      // Only save if changed
      if (row.currentPrice === price && row.currentUnit === row.newUnit) continue;

      try {
        const res = await upsertStandardPrice({
          subCategoryId: row.subCategoryId,
          zoneId,
          pricePerUnit: price,
          unit: row.newUnit as any,
        });
        if (res.success) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }

    setBulkSaving(false);
    if (errorCount === 0 && successCount > 0) {
      setMessage({ text: `${successCount} prix mis à jour avec succès`, type: 'success' });
    } else if (errorCount > 0) {
      setMessage({ text: `${successCount} succès, ${errorCount} erreurs`, type: 'error' });
    } else {
      setMessage({ text: 'Aucun changement détecté', type: 'success' });
    }
    loadData();
  };

  // Group rows by category
  const grouped = new Map<string, PriceRow[]>();
  for (const row of rows) {
    const arr = grouped.get(row.categoryName) || [];
    arr.push(row);
    grouped.set(row.categoryName, arr);
  }

  const changedCount = rows.filter(r => {
    const p = parseFloat(r.newPrice);
    return !isNaN(p) && p > 0 && (r.currentPrice !== p || r.currentUnit !== r.newUnit);
  }).length;

  return { rows, loading, saving, bulkSaving, message, updateRow, saveRow, saveAll, grouped, changedCount };
}
