'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCategories } from '@/features/governance/actions/categories.actions';
import type { Category } from '@/features/governance/components/category/category.config';

/** Chargement de l'arbre catégories / sous-catégories et état d'expansion. */
export function useCategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCategories();
      if (result.success && result.data) {
        setCategories(result.data as Category[]);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  return {
    categories,
    loading,
    expanded,
    loadCategories,
    toggleExpand,
  };
}
