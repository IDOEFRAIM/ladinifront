'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useTransition } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useProductMetadata } from '@/hooks/useProductMetadata';
import { createProductAction, updateProductAction } from '@/app/actions/createProductAction';
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
  isSubmitting: boolean;
  isSuccess: boolean;
  errorMsg: string | null;
  formRef: React.RefObject<HTMLFormElement | null>;
  audioInputRef: React.RefObject<HTMLInputElement | null>;
  imagesInputRef: React.RefObject<HTMLInputElement | null>;
  prepareAndSubmit: () => Promise<void>;
  metadata: ReturnType<typeof useProductMetadata>;
}

export function useProductForm(
  mode: ProductFlowMode,
  initialData?: Record<string, any>,
): UseProductFormReturn {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isPending, startTransition] = useTransition();
  
  const metadata = useProductMetadata();
  const { categories, getPriceForSubCategory, findParentCategory, loading: metadataLoading } = metadata;

  // ── React Hook Form ──────────────────────────────────────────────
  const form = useForm<ProductFormData>({ 
    defaultValues: PRODUCT_FORM_DEFAULTS 
  });
  const { setValue, watch, reset, getValues, handleSubmit } = form;

  // ── States Atomiques ─────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────
  const formRef = useRef<HTMLFormElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);

  // ── Watchers & Memos Ciblé ───────────────────────────────────────
  const watchedCategoryId = watch('categoryId');
  
  const defaultPriceInfo = useMemo(() => {
    return getPriceForSubCategory(watchedCategoryId);
  }, [watchedCategoryId, getPriceForSubCategory]);

  const totalImages = useMemo(() => existingImages.length + newImages.length, [existingImages, newImages]);

  const isHydratedRef = useRef(false);

  // ── Effet 1 : Hydratation initiale du Formulaire (Edit Mode) ──────
  useEffect(() => {
    if (mode !== 'edit' || !initialData || isHydratedRef.current) return;

    reset({
      id: initialData.id || '',
      categoryLabel: initialData.categoryLabel || '',
      categoryId: initialData.categoryId || initialData.subCategoryId || undefined,
      name: initialData.name || '',
      description: initialData.description || '',
      price: initialData.price?.toString() || '',
      unit: initialData.unit || 'KG',
      quantityForSale: (initialData.quantityForSale || initialData.quantity || initialData.quantityForSale)?.toString() || '',
    });

    if (initialData.category) setSelectedCategory(String(initialData.category));
    if (Array.isArray(initialData.images)) setExistingImages(initialData.images);
    
    isHydratedRef.current = true;
  }, [initialData, mode, reset]);

  // ── Effet 2 : Résolution Catégorie Parente ─────────────────────────
  useEffect(() => {
    if (mode !== 'edit' || !initialData || categories.length === 0 || metadataLoading) return;

    const subId = initialData.categoryId || initialData.subCategoryId || initialData.subCategory?.id;
    if (!subId) return;

    const match = findParentCategory(String(subId));
    if (match) {
      const parentId = String(match.parent.id);
      setSelectedCategory(parentId);
      setValue('categoryId', String(subId));
      setValue('categoryLabel', `${match.parent.name} / ${match.sub.name}`);
      setStep(4); // Redirection automatique à l'étape des détails en mode édition
    }
  }, [categories, initialData, mode, setValue, findParentCategory, metadataLoading]);

  // ── Effet 3 : Remplissage dynamique des prix conseillés ───────────
  useEffect(() => {
    if (!defaultPriceInfo) return;
    const currentPrice = parseFloat(String(getValues('price') || '0'));
    if (!currentPrice || currentPrice <= 0) {
      setValue('price', String(defaultPriceInfo.price || ''));
    }
    const currentUnit = getValues('unit');
    if (defaultPriceInfo.unit && defaultPriceInfo.unit !== currentUnit) {
      setValue('unit', defaultPriceInfo.unit);
    }
  }, [defaultPriceInfo, setValue, getValues]);

  // ── Effet 4 : Nettoyage strict de la mémoire vive (Previews) ──────
  useEffect(() => {
    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newPreviews]);

  // ── Callbacks : Navigation ───────────────────────────────────────
  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  
  const goBack = useCallback(() => {
    setStep((s) => {
      if (s <= 1) { router.back(); return s; }
      return s - 1;
    });
  }, [router]);

  // ── Callbacks : Gestion des sélections ────────────────────────────
  const selectCategory = useCallback((catId: string, catName: string) => {
    setSelectedCategory(catId);
    setValue('categoryLabel', catName);
    setValue('categoryId', ''); 
    setStep(2);
  }, [setValue]);

  const selectSubCategory = useCallback((subId: string, label: string) => {
    setValue('categoryId', subId);
    setValue('categoryLabel', label);
    setStep(3);
  }, [setValue]);

  const resetCategory = useCallback(() => {
    setSelectedCategory(null);
    setValue('categoryId', '');
    setValue('categoryLabel', '');
    setStep(1);
  }, [setValue]);

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

  // ── SOUUMISSION SECURISEE VIA SERVER ACTIONS 🔥 ───────────────────
  const prepareAndSubmit = useCallback(async () => {
    if (authLoading || isPending) return;
    setErrorMsg(null);

    handleSubmit((values) => {
      startTransition(async () => {
        try {
          if (!values.name || !values.categoryId || !values.quantityForSale || Number(values.price) <= 0) {
            throw new Error('Veuillez compléter tous les champs obligatoires.');
          }

          const formData = new FormData();
          
          // 1. Injection des valeurs textes typées
          Object.entries(values).forEach(([key, val]) => {
            formData.append(key, String(val ?? ''));
          });

          // 2. Alignement des fichiers médias
          newImages.forEach((file) => {
            formData.append('images', file);
          });
          
          if (audioBlob) {
            formData.append('audio', audioBlob, 'desc_vocale.webm');
          }
          
          formData.append('existingImages', JSON.stringify(existingImages));

          // 3. Dispatch de l'action
          const action = mode === 'create' ? createProductAction : updateProductAction;
          const res = await action(formData);

          if (res.success) {
            setIsSuccess(true);
            setTimeout(() => {
              router.refresh();
              router.push('/products');
            }, 800);
          } else {
            throw new Error(res.error || 'Une erreur est survenue lors de la sauvegarde.');
          }

        } catch (err: any) {
          setErrorMsg(err?.message || 'Une erreur est survenue lors de la soumission.');
        }
      });
    })();
  }, [authLoading, isPending, handleSubmit, newImages, audioBlob, existingImages, mode, router]);

  return {
    user, authLoading, router,
    form,
    step, setStep, goNext, goBack,
    selectedCategory, selectCategory, selectSubCategory, resetCategory,
    existingImages, newImages, newPreviews, addImage, removeExistingImage, removeNewImage, totalImages,
    audioBlob, setAudioBlob,
    defaultPriceInfo,
    isSubmitting: isPending,
    isSuccess, errorMsg,
    formRef, audioInputRef, imagesInputRef,
    prepareAndSubmit,
    metadata,
  };
}