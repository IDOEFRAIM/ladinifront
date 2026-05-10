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
  Category,
} from '@/types/product-flow';
import { PRODUCT_FORM_DEFAULTS, TOTAL_STEPS, ALLOWED_IMAGE_TYPES } from '@/types/product-flow';

// ── Return type ────────────────────────────────────────────────────────

export interface UseProductFormReturn {
  // Auth
  user: ReturnType<typeof useAuth>['user'];
  authLoading: boolean;
  router: ReturnType<typeof useRouter>;

  // React Hook Form
  form: UseFormReturn<ProductFormData>;

  // Wizard navigation
  step: number;
  setStep: (s: number) => void;
  goNext: () => void;
  goBack: () => void;

  // Category selection
  selectedCategory: string | null;
  selectCategory: (catId: string, catName: string) => void;
  selectSubCategory: (subId: string, label: string) => void;
  resetCategory: () => void;

  // Images
  existingImages: string[];
  newImages: File[];
  newPreviews: string[];
  addImage: (file: File) => void;
  removeExistingImage: (index: number) => void;
  removeNewImage: (index: number) => void;
  totalImages: number;

  // Audio
  audioBlob: Blob | null;
  setAudioBlob: (blob: Blob | null) => void;

  // Price
  defaultPriceInfo: PriceInfo | null;

  // Submission
  isSubmitting: boolean;
  isSuccess: boolean;
  errorMsg: string | null;
  formRef: React.RefObject<HTMLFormElement | null>;
  audioInputRef: React.RefObject<HTMLInputElement | null>;
  imagesInputRef: React.RefObject<HTMLInputElement | null>;
  prepareAndSubmit: () => Promise<void>;

  // Metadata (re-exported for UI)
  metadata: ReturnType<typeof useProductMetadata>;
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useProductForm(
  mode: ProductFlowMode,
  initialData?: Record<string, any>,
): UseProductFormReturn {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const metadata = useProductMetadata();
  const { categories, getPriceForSubCategory, findParentCategory } = metadata;

  // ── React Hook Form ──────────────────────────────────────────────
  const form = useForm<ProductFormData>({ defaultValues: PRODUCT_FORM_DEFAULTS });
  const { setValue, watch, reset } = form;

  // ── Wizard state ─────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── File state ───────────────────────────────────────────────────
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // ── Submission state ─────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────
  const formRef = useRef<HTMLFormElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);

  // ── Watched values for price prefill logic ───────────────────────
  const watchedCategoryId = watch('categoryId');
  const watchedPrice = watch('price');

  // ── Derived: default price for current subcategory ───────────────
  const defaultPriceInfo = getPriceForSubCategory(watchedCategoryId);

  // ── Hydrate form in edit mode ────────────────────────────────────
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

    if (initialData.images && Array.isArray(initialData.images)) {
      setExistingImages(initialData.images);
    }
  }, [initialData, mode, reset]);

  // ── Infer parent category from subcategory in edit mode ──────────
  useEffect(() => {
    if (mode !== 'edit' || !initialData || categories.length === 0) return;

    const subId = initialData.categoryId || initialData.subCategoryId || initialData.subCategory?.id;
    if (!subId) return;

    const match = findParentCategory(String(subId));
    if (!match) return;

    setSelectedCategory(String(match.parent.id));
    setValue('category', String(match.parent.id));
    setValue('categoryId', String(subId));
    setValue('categoryLabel', `${match.parent.name} / ${match.sub.name}`);
    setStep(2);
  }, [categories, initialData, mode, setValue, findParentCategory]);

  // ── Prefill price from standard prices ───────────────────────────
  useEffect(() => {
    if (!defaultPriceInfo) return;
    const current = parseFloat(String(watchedPrice || '0'));
    if (!current || current <= 0) {
      setValue('price', String(defaultPriceInfo.price || ''));
    }
    if (defaultPriceInfo.unit) {
      setValue('unit', defaultPriceInfo.unit);
    }
  }, [defaultPriceInfo, setValue, watchedPrice]);

  // ── Cleanup preview URLs on unmount ──────────────────────────────
  useEffect(() => {
    return () => newPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [newPreviews]);

  // ── Navigation ───────────────────────────────────────────────────
  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const goBack = useCallback(() => {
    setStep((s) => {
      if (s <= 1) { router.back(); return s; }
      return s - 1;
    });
  }, [router]);

  // ── Category actions ─────────────────────────────────────────────
  const selectCategory = useCallback(
    (catId: string, catName: string) => {
      setSelectedCategory(catId);
      setValue('category', catId);
      setValue('categoryLabel', catName);
      setStep(2);
    },
    [setValue],
  );

  const selectSubCategory = useCallback(
    (subId: string, label: string) => {
      setValue('categoryId', subId);
      setValue('categoryLabel', label);
      setStep(3);
    },
    [setValue],
  );

  const resetCategory = useCallback(() => {
    setSelectedCategory(null);
    setValue('category', '');
    setValue('categoryLabel', '');
    setStep(1);
  }, [setValue]);

  // ── Image actions ────────────────────────────────────────────────
  const addImage = useCallback((file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    setNewImages((prev) => [...prev, file]);
    setNewPreviews((prev) => [...prev, URL.createObjectURL(file)]);
  }, []);

  const removeExistingImage = useCallback((index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeNewImage = useCallback((index: number) => {
    setNewPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const totalImages = existingImages.length + newImages.length;

  // ── Submission ───────────────────────────────────────────────────
  const prepareAndSubmit = useCallback(async () => {
    if (authLoading) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Auto-derive categoryLabel if missing
      const currentLabel = watch('categoryLabel');
      const currentCatId = watch('categoryId');
      if (!currentLabel && currentCatId) {
        const match = findParentCategory(String(currentCatId));
        if (match) setValue('categoryLabel', `${match.parent.name} / ${match.sub.name}`);
      }

      // Prefill price from standard if still empty
      const currentPrice = watch('price');
      if ((!currentPrice || Number(currentPrice) <= 0) && defaultPriceInfo?.price) {
        setValue('price', String(defaultPriceInfo.price));
        if (defaultPriceInfo.unit) setValue('unit', defaultPriceInfo.unit);
      }

      // Client-side validation
      const finalPrice = parseFloat(String(watch('price') || '0'));
      const finalQty = parseFloat(String(watch('quantity') || '0'));
      const finalName = String(watch('name') || '');
      const finalCatLabel = String(watch('categoryLabel') || '');

      if (!finalName || !finalCatLabel || !finalQty || finalPrice <= 0) {
        setIsSubmitting(false);
        setErrorMsg('Veuillez compléter le nom, la catégorie, la quantité et un prix valide avant de publier.');
        return;
      }

      // Populate hidden file inputs for native form submission
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

      // Ensure hidden id field (edit mode)
      if (mode === 'edit' && initialData?.id) {
        const idInput = formRef.current?.querySelector('input[name="id"]') as HTMLInputElement | null;
        if (idInput) idInput.value = String(initialData.id);
      }

      // Submit the native form
      formRef.current?.requestSubmit?.();

      // Auto-clear overlay after a safety timeout
      const tid = setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 2000);
      }, 4000);

      if (formRef.current) (formRef.current as any)._autoClearTimeout = tid;
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Erreur préparation du formulaire');
    }
  }, [
    authLoading, watch, findParentCategory, setValue, defaultPriceInfo,
    newImages, audioBlob, mode, initialData,
  ]);

  return {
    user, authLoading, router,
    form,
    step, setStep, goNext, goBack,
    selectedCategory, selectCategory, selectSubCategory, resetCategory,
    existingImages, newImages, newPreviews, addImage, removeExistingImage, removeNewImage, totalImages,
    audioBlob, setAudioBlob,
    defaultPriceInfo,
    isSubmitting, isSuccess, errorMsg,
    formRef, audioInputRef, imagesInputRef,
    prepareAndSubmit,
    metadata,
  };
}
