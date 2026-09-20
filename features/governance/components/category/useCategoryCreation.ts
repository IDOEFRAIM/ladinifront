'use client';

import { useState } from 'react';
import { createCategory, createSubCategory } from '@/features/governance/actions/categories.actions';
import { asError } from '@/lib/errors';

/** Formulaires de création d'une catégorie et d'une sous-catégorie. */
export function useCategoryCreation(loadCategories: () => void) {
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catLoading, setCatLoading] = useState(false);
  const [catMsg, setCatMsg] = useState<string | null>(null);

  // New subcategory form
  const [subCatFor, setSubCatFor] = useState<string | null>(null);
  const [subCatName, setSubCatName] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subMsg, setSubMsg] = useState<string | null>(null);

  const handleCreateCategory = async () => {
    if (!catName.trim()) return setCatMsg('Le nom est requis');
    setCatLoading(true);
    setCatMsg(null);
    try {
      const res = await createCategory({ name: catName.trim(), description: catDesc.trim() || undefined });
      if (res.success) {
        setCatMsg('Catégorie créée');
        setCatName('');
        setCatDesc('');
        setShowCatForm(false);
        loadCategories();
      } else {
        setCatMsg(res.error || 'Erreur');
      }
    } catch (_e: unknown) {
    const e = asError(_e);
      setCatMsg(e.message || 'Erreur');
    } finally {
      setCatLoading(false);
    }
  };

  const handleCreateSubCategory = async (categoryId: string) => {
    if (!subCatName.trim()) return setSubMsg('Le nom est requis');
    setSubLoading(true);
    setSubMsg(null);
    try {
      const res = await createSubCategory({ categoryId, name: subCatName.trim() });
      if (res.success) {
        setSubMsg('Sous-catégorie créée');
        setSubCatName('');
        setSubCatFor(null);
        loadCategories();
      } else {
        setSubMsg(res.error || 'Erreur');
      }
    } catch (_e: unknown) {
    const e = asError(_e);
      setSubMsg(e.message || 'Erreur');
    } finally {
      setSubLoading(false);
    }
  };
  return {
    showCatForm,
    setShowCatForm,
    catName,
    setCatName,
    catDesc,
    setCatDesc,
    catLoading,
    catMsg,
    setCatMsg,
    subCatFor,
    setSubCatFor,
    subCatName,
    setSubCatName,
    subLoading,
    subMsg,
    setSubMsg,
    handleCreateCategory,
    handleCreateSubCategory,
  };
}
