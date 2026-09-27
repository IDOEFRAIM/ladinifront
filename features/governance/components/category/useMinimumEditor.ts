'use client';

import { useState } from 'react';
import { updateSubCategoryMinimum } from '@/features/governance/actions/categories.actions';
import { asError } from '@/lib/errors';
import type { SubCategory } from '@/features/governance/components/category/category.config';

/** Éditeur du seuil minimum de commande (policy plateforme, jamais éditable par le producteur). */
export function useMinimumEditor(loadCategories: () => void) {
  const [minEditFor, setMinEditFor] = useState<string | null>(null);
  const [minQtyInput, setMinQtyInput] = useState('');
  const [minUnitInput, setMinUnitInput] = useState<string>('KG');
  const [minLoading, setMinLoading] = useState(false);
  const [minMsg, setMinMsg] = useState<string | null>(null);

  const openMinEditor = (sub: SubCategory) => {
    setMinEditFor(sub.id);
    setMinQtyInput(sub.minimumOrderQuantity ?? '');
    setMinUnitInput(sub.minimumOrderUnit ?? 'KG');
    setMinMsg(null);
  };

  const handleSaveMinimum = async (subCategoryId: string) => {
    const trimmed = minQtyInput.trim();
    const quantity = trimmed === '' ? null : Number(trimmed);
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
      setMinMsg('La quantité doit être un nombre strictement positif (laissez vide pour supprimer le seuil).');
      return;
    }
    setMinLoading(true);
    setMinMsg(null);
    try {
      const res = await updateSubCategoryMinimum({
        subCategoryId,
        minimumOrderQuantity: quantity,
        minimumOrderUnit: quantity !== null ? (minUnitInput as any) : null,
      });
      if (res.success) {
        setMinEditFor(null);
        loadCategories();
      } else {
        setMinMsg(res.error || 'Erreur');
      }
    } catch (_e: unknown) {
    const e = asError(_e);
      setMinMsg(e.message || 'Erreur');
    } finally {
      setMinLoading(false);
    }
  };

  const handleClearMinimum = async (subCategoryId: string) => {
    setMinLoading(true);
    setMinMsg(null);
    try {
      const res = await updateSubCategoryMinimum({ subCategoryId, minimumOrderQuantity: null });
      if (res.success) {
        setMinEditFor(null);
        loadCategories();
      } else {
        setMinMsg(res.error || 'Erreur');
      }
    } catch (_e: unknown) {
    const e = asError(_e);
      setMinMsg(e.message || 'Erreur');
    } finally {
      setMinLoading(false);
    }
  };
  return {
    minEditFor,
    setMinEditFor,
    minQtyInput,
    setMinQtyInput,
    minUnitInput,
    setMinUnitInput,
    minLoading,
    minMsg,
    setMinMsg,
    openMinEditor,
    handleSaveMinimum,
    handleClearMinimum,
  };
}
