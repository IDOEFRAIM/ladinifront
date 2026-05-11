'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
// 1. Correction Import : Assure-toi que le chemin est exact et sans export default
import { useProductMetadata } from '@/hooks/useProductMetadata';
import type {
  ProductFormData,
  ProductFlowMode,
  PriceInfo,
  Category,
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
  
  // Initialisation du metadata
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────
  const formRef = useRef<HTMLFormElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);

  // ── Watchers ──────────────────────────────────────────────────────
  const watchedCategoryId = watch('categoryId');
  const defaultPriceInfo = getPriceForSubCategory(watchedCategoryId);

  // ── Effet : Hydratation initiale (Edit Mode) ──────────────────────
  useEffect(() => {
    if (mode !== 'edit' || !initialData) return;

    reset({
      category: initialData.category || '',
      categoryLabel: initialData.categoryLabel || '',
      categoryId: initialData.categoryId || initialData.subCategoryId || undefined,
      name: initialData.name || '',
      description: initialData.description || '',
      price: initialData.price?.toString() || '',
      unit: initialData.unit || 'KG',
      quantity: (initialData.quantityForSale || initialData.quantity)?.toString() || '',
    });

    if (initialData.category) setSelectedCategory(String(initialData.category));
    if (Array.isArray(initialData.images)) setExistingImages(initialData.images);
  }, [initialData, mode, reset]);

  // ── Effet : Résolution Catégorie Parente ─────────────────────────
  useEffect(() => {
    if (mode !== 'edit' || !initialData || categories.length === 0) return;

    const subId = initialData.categoryId || initialData.subCategoryId || initialData.subCategory?.id;
    if (!subId) return;

    const match = findParentCategory(String(subId));
    if (match) {
      setSelectedCategory(String(match.parent.id));
      setValue('category', String(match.parent.id));
      setValue('categoryId', String(subId));
      setValue('categoryLabel', `${match.parent.name} / ${match.sub.name}`);
      setStep(2);
    }
  }, [categories, initialData, mode, setValue, findParentCategory]);

  // ── Effet : Prefill price from standard prices ───────────────────────────
  useEffect(() => {
    if (!defaultPriceInfo) return;
    const current = parseFloat(String(form.getValues('price') || '0'));
    if (!current || current <= 0) {
      setValue('price', String(defaultPriceInfo.price || ''));
    }
    const currentUnit = form.getValues('unit');
    if (defaultPriceInfo.unit && defaultPriceInfo.unit !== currentUnit) {
      setValue('unit', defaultPriceInfo.unit);
    }
  }, [defaultPriceInfo, setValue, form]);

  // ── Effet : Cleanup Previews ─────────────────────────────────────
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

  // ── Callbacks : Catégories ───────────────────────────────────────
  const selectCategory = useCallback((catId: string, catName: string) => {
    setSelectedCategory(catId);
    setValue('category', catId);
    setValue('categoryLabel', catName);
    setStep(2);
  }, [setValue]);

  const selectSubCategory = useCallback((subId: string, label: string) => {
    setValue('categoryId', subId);
    setValue('categoryLabel', label);
    setStep(3);
  }, [setValue]);

  const resetCategory = useCallback(() => {
    setSelectedCategory(null);
    setValue('category', '');
    setValue('categoryId', '');
    setValue('categoryLabel', '');
    setStep(1);
  }, [setValue]);

  // ── Callbacks : Images ───────────────────────────────────────────
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

  // ── Soumission ───────────────────────────────────────────────────
  const prepareAndSubmit = useCallback(async () => {
    if (authLoading) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const values = getValues();

      // Validation finale
      if (!values.name || !values.categoryId || !values.quantity || Number(values.price) <= 0) {
        throw new Error('Veuillez compléter tous les champs obligatoires.');
      }

      // Injection des fichiers dans les inputs natifs pour requestSubmit
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

      // Soumission du formulaire HTML natif
      if (formRef.current) {
        formRef.current.requestSubmit();
      }

      // Feedback visuel
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(true);
      }, 1000);

    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Une erreur est survenue');
    }
  }, [authLoading, getValues, newImages, audioBlob]);

  return {
    user, authLoading, router,
    form,
    step, setStep, goNext, goBack,
    selectedCategory, selectCategory, selectSubCategory, resetCategory,
    existingImages, newImages, newPreviews, addImage, removeExistingImage, removeNewImage, totalImages: existingImages.length + newImages.length,
    audioBlob, setAudioBlob,
    defaultPriceInfo,
    isSubmitting, isSuccess, errorMsg,
    formRef, audioInputRef, imagesInputRef,
    prepareAndSubmit,
    metadata,
  };
}