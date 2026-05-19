'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProductMetadata } from '@/hooks/useProductMetadata';
import type {
  ProductFormData,
  ProductFlowMode,
  PriceInfo,
} from '@/types/product-flow';
import { PRODUCT_FORM_DEFAULTS, TOTAL_STEPS, ALLOWED_IMAGE_TYPES } from '@/types/product-flow';

export interface UseProductFormReturn {
  user: ReturnType<typeof useAuth>['user'];
  authLoading: boolean;
  router: ReturnType<typeof useRouter>;
  form: UseFormReturn<ProductFormData>;
  step: number;
  setStep: (s: number) => void;
  goNext: () => void;
  goBack: () => void;
  selectedCategory: string | null;
  selectCategory: (catId: string, catName: string) => void;
  selectSubCategory: (subId: string, label: string) => void;
  resetCategory: () => void;
  existingImages: string[];
  newImages: File[];
  newPreviews: string[];
  addImage: (file: File) => void;
  removeExistingImage: (index: number) => void;
  removeNewImage: (index: number) => void;
  totalImages: number;
  audioBlob: Blob | null;
  setAudioBlob: (blob: Blob | null) => void;
  defaultPriceInfo: PriceInfo | null;
  formRef: React.RefObject<HTMLFormElement | null>;
  audioInputRef: React.RefObject<HTMLInputElement | null>;
  imagesInputRef: React.RefObject<HTMLInputElement | null>;
  prepareFileInputs: () => void;
  metadata: ReturnType<typeof useProductMetadata>;
}

export function useProductForm(
  mode: ProductFlowMode,
  initialData?: Record<string, any>,
): UseProductFormReturn {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  // Initialisation du metadata catalogue
  const metadata = useProductMetadata();
  const { categories, getPriceForSubCategory, findParentCategory } = metadata;

  // ── React Hook Form ──────────────────────────────────────────────
  const form = useForm<ProductFormData>({ 
    defaultValues: PRODUCT_FORM_DEFAULTS 
  });
  const { setValue, watch, reset, getValues } = form;

  // ── States ───────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // ── Refs & Verrous d'hydratation ──────────────────────────────────
  const formRef = useRef<HTMLFormElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);
  
  // Verrous d'exécution unique pour éviter les boucles durant la saisie
  const hasHydrated = useRef(false); 
  const hasResolvedParent = useRef(false);

  // ── Watchers ──────────────────────────────────────────────────────
  const watchedSubCategoryId = watch('subCategoryId');
  const defaultPriceInfo = getPriceForSubCategory(watchedSubCategoryId);

  // ── Effet : Hydratation initiale unique (Edit Mode) ────────────────
  useEffect(() => {
    if (mode !== 'edit' || !initialData || hasHydrated.current) return;

    reset({
      categoryId: initialData.categoryId || '',
      categoryLabel: initialData.categoryLabel || '',
      subCategoryId: initialData.subCategoryId || initialData.categoryId || '',
      name: initialData.name || '',
      description: initialData.description || '',
      price: initialData.price?.toString() || '',
      unit: initialData.unit || 'KG',
      quantityForSale: (initialData.quantityForSale || initialData.quantity)?.toString() || '',
    });

    if (initialData.categoryId) setSelectedCategory(String(initialData.categoryId));
    if (Array.isArray(initialData.images)) setExistingImages(initialData.images);
    
    hasHydrated.current = true; // Verrouille définitivement l'hydratation initiale
  }, [initialData, mode, reset]);

  // ── Effet : Résolution Catégorie Parente STRICTEMENT UNIQUE ──
  useEffect(() => {
    if (mode !== 'edit' || !initialData || categories.length === 0 || hasResolvedParent.current) return;

    const subId = initialData.subCategoryId || initialData.categoryId || initialData.subCategory?.id;
    if (!subId) return;

    const match = findParentCategory(String(subId));
    if (match) {
      setSelectedCategory(String(match.parent.id));
      setValue('categoryId', String(match.parent.id));
      setValue('subCategoryId', String(subId));
      setValue('categoryLabel', `${match.parent.name} / ${match.sub.name}`);
      
      // Sécurité : On ne force l'étape 2 que si l'utilisateur n'a pas déjà avancé seul
      setStep((currentStep) => currentStep === 1 ? 2 : currentStep);
      hasResolvedParent.current = true; // Empêche toute réexécution ou retour en arrière forcé
    }
  }, [categories, initialData, mode, setValue, findParentCategory]);

  // ── Effet : Remplissage intelligent du prix (Mise à jour isolée sans boucle) ──
  useEffect(() => {
    if (!defaultPriceInfo) return;
    
    // getValues sans dépendance directe sur l'objet form pour casser la boucle de re-render
    const currentPrice = parseFloat(String(getValues('price') || '0'));
    if (!currentPrice || currentPrice <= 0) {
      setValue('price', String(defaultPriceInfo.price || ''));
    }
    
    const currentUnit = getValues('unit');
    if (defaultPriceInfo.unit && defaultPriceInfo.unit !== currentUnit) {
      setValue('unit', defaultPriceInfo.unit);
    }
  }, [defaultPriceInfo, setValue, getValues]);

  // ── Effet : Nettoyage de la mémoire des ObjectURLs (Blobs photos) ──
  useEffect(() => {
    return () => {
      newPreviews.forEach((url) => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [newPreviews]);

  // ── Callbacks : Navigation du Tunnel ───────────────────────────────
  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  
  const goBack = useCallback(() => {
    setStep((s) => {
      if (s <= 1) { router.back(); return s; }
      return s - 1;
    });
  }, [router]);

  // ── Callbacks : Sélection des Catégories ───────────────────────────
  const selectCategory = useCallback((catId: string, catName: string) => {
    setSelectedCategory(catId);
    setValue('categoryId', catId);
    setValue('categoryLabel', catName);
    setStep(2);
  }, [setValue]);

  const selectSubCategory = useCallback((subId: string, label: string) => {
    setValue('subCategoryId', subId);
    setValue('categoryLabel', label);
    setStep(3);
  }, [setValue]);

  const resetCategory = useCallback(() => {
    setSelectedCategory(null);
    setValue('categoryId', '');
    setValue('subCategoryId', '');
    setValue('categoryLabel', '');
    setStep(1);
  }, [setValue]);

  // ── Callbacks : Gestion du carrousel d'images ─────────────────────
  const addImage = useCallback((file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    setNewImages((prev) => [...prev, file]);
    setNewPreviews((prev) => [...prev, URL.createObjectURL(file)]);
  }, []);

  const removeNewImage = useCallback((index: number) => {
    setNewPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeExistingImage = useCallback((index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Traitement et injection des fichiers physiques avant envoi ────
  const prepareFileInputs = useCallback(() => {
    if (authLoading) return;

    const values = getValues();
    if (!values.name || !values.subCategoryId || !values.quantityForSale || Number(values.price) <= 0) {
      throw new Error('Veuillez compléter tous les champs obligatoires.');
    }

    if (imagesInputRef.current) {
      const dt = new DataTransfer();
      newImages.forEach((f) => dt.items.add(f));
      imagesInputRef.current.files = dt.files;
    }

    if (audioBlob && audioInputRef.current) {
      const audioFile = new File([audioBlob], 'desc_vocale.webm', { type: 'audio/webm' });
      const dt = new DataTransfer();
      dt.items.add(audioFile);
      audioInputRef.current.files = dt.files;
    }
  }, [authLoading, getValues, newImages, audioBlob]);

  return {
    user, authLoading, router,
    form,
    step, setStep, goNext, goBack,
    selectedCategory, selectCategory, selectSubCategory, resetCategory,
    existingImages, newImages, newPreviews, addImage, removeExistingImage, removeNewImage, 
    totalImages: existingImages.length + newImages.length,
    audioBlob, setAudioBlob,
    defaultPriceInfo,
    formRef, audioInputRef, imagesInputRef,
    prepareFileInputs,
    metadata,
  };
}