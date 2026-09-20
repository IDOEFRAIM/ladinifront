'use client';

import { useState } from 'react';
import { updateSubCategoryUnitConfig } from '@/features/governance/actions/categories.actions';
import { asError } from '@/lib/errors';
import { type SubCategoryUnit } from '@/lib/quantityUnit';
import type { SubCategory } from '@/features/governance/components/category/category.config';

/** Éditeur des unités autorisées / prioritaire (policy plateforme, jamais éditable par le producteur). */
export function useUnitConfigEditor(loadCategories: () => void) {
  const [unitEditFor, setUnitEditFor] = useState<string | null>(null);
  const [unitAllowedInput, setUnitAllowedInput] = useState<SubCategoryUnit[]>([]);
  const [unitPriorityInput, setUnitPriorityInput] = useState<SubCategoryUnit | ''>('');
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitMsg, setUnitMsg] = useState<string | null>(null);

  const openUnitEditor = (sub: SubCategory) => {
    setUnitEditFor(sub.id);
    setUnitAllowedInput((sub.allowedUnits ?? []) as SubCategoryUnit[]);
    setUnitPriorityInput((sub.priorityUnit ?? '') as SubCategoryUnit | '');
    setUnitMsg(null);
  };

  const toggleAllowedUnit = (unit: SubCategoryUnit) => {
    setUnitAllowedInput((prev) => {
      const next = prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit];
      // Une unité prioritaire retirée des unités autorisées n'est plus valide.
      if (unitPriorityInput === '' || !next.includes(unitPriorityInput)) {
        setUnitPriorityInput(next.length === 1 ? next[0] : '');
      }
      return next;
    });
  };

  const handleSaveUnitConfig = async (subCategoryId: string) => {
    if (unitAllowedInput.length === 0) {
      setUnitMsg('Sélectionnez au moins une unité autorisée (ou utilisez « Supprimer la config »).');
      return;
    }
    if (unitAllowedInput.length > 1 && !unitPriorityInput) {
      setUnitMsg('Une unité prioritaire est requise dès que plusieurs unités sont autorisées.');
      return;
    }
    setUnitLoading(true);
    setUnitMsg(null);
    try {
      const res = await updateSubCategoryUnitConfig({
        subCategoryId,
        allowedUnits: unitAllowedInput,
        priorityUnit: unitPriorityInput || undefined,
      });
      if (res.success) {
        setUnitEditFor(null);
        loadCategories();
      } else {
        setUnitMsg(res.error || 'Erreur');
      }
    } catch (_e: unknown) {
    const e = asError(_e);
      setUnitMsg(e.message || 'Erreur');
    } finally {
      setUnitLoading(false);
    }
  };

  const handleClearUnitConfig = async (subCategoryId: string) => {
    setUnitLoading(true);
    setUnitMsg(null);
    try {
      const res = await updateSubCategoryUnitConfig({ subCategoryId, allowedUnits: null });
      if (res.success) {
        setUnitEditFor(null);
        loadCategories();
      } else {
        setUnitMsg(res.error || 'Erreur');
      }
    } catch (_e: unknown) {
    const e = asError(_e);
      setUnitMsg(e.message || 'Erreur');
    } finally {
      setUnitLoading(false);
    }
  };
  return {
    unitEditFor,
    setUnitEditFor,
    unitAllowedInput,
    unitPriorityInput,
    setUnitPriorityInput,
    unitLoading,
    unitMsg,
    setUnitMsg,
    openUnitEditor,
    toggleAllowedUnit,
    handleSaveUnitConfig,
    handleClearUnitConfig,
  };
}
