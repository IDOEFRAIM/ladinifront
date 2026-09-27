'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ALLOWED_IMAGE_TYPES } from '@/features/products/types/product-flow.types';

/** Photos (existantes + nouvelles, avec aperçus libérés au démontage) et note vocale du formulaire produit. */
export function useProductMedia() {
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const totalImages = useMemo(() => existingImages.length + newImages.length, [existingImages, newImages]);

  // ── Effet 4 : Nettoyage strict de la mémoire vive (Previews) ──────
  useEffect(() => {
    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newPreviews]);

  // ── Callbacks : Médias ───────────────────────────────────────────
  const addImage = useCallback((file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    setNewImages((prev) => [...prev, file]);
    setNewPreviews((prev) => [...prev, URL.createObjectURL(file)]);
  }, []);

  const removeNewImage = useCallback((index: number) => {
    setNewPreviews((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeExistingImage = useCallback((index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);


  return {
    existingImages, setExistingImages, newImages, newPreviews, audioBlob, setAudioBlob,
    totalImages, addImage, removeNewImage, removeExistingImage,
  };
}
