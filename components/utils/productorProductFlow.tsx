'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';
import { createProductAction, updateProductAction } from '@/app/actions/createProductAction';
import { useProductForm } from '@/hooks/useProductForm';
import { toast } from 'react-hot-toast';
import type { ProductFlowProps } from '@/types/product-flow';

import ProductStepper from '@/components/product/ProductStepper';
import SubmitOverlay from '@/components/product/SubmitOverlay';
import StepCategories from '@/components/product/StepCategories';
import StepSubCategories from '@/components/product/StepSubCategories';
import StepPhotos from '@/components/product/StepPhotos';
import StepDetails from '@/components/product/StepDetails';
import StepAudio from '@/components/product/StepAudio';
import StepReview from '@/components/product/StepReview';

export default function ProductFlow({ mode, initialData }: ProductFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const ctx = useProductForm(mode, initialData);
  const {
    authLoading, form, step, goBack,
    selectedCategory, selectCategory, selectSubCategory, resetCategory,
    existingImages, newPreviews, totalImages, addImage, removeExistingImage, removeNewImage,
    audioBlob, setAudioBlob,
    defaultPriceInfo,
    formRef, audioInputRef, imagesInputRef,
    prepareFileInputs, goNext,
    metadata,
  } = ctx;

  const { watch, getValues } = form;
  
  // ── WATCHERS STRUCTURELS ET SÉCURISÉS ───────────────────────────────────
  // On observe UNIQUEMENT les identifiants de catégories pour piloter la navigation.
  // SUPPRESSION des watchers textuels (name, price, qty) qui détruisaient le focus au clavier.
  const watchedCategoryId = watch('categoryId');
  const watchedSubCategoryId = watch('subCategoryId');
  const watchedCategoryLabel = watch('categoryLabel');

  // Stabilisation des catégories pour éviter les micro-blocages CPU
  const currentCategories = metadata.categories;

  // Calcul mémorisé du nombre de concurrents basé sur l'ID de la sous-catégorie
  const competitorCount = useMemo(() => {
    if (!watchedSubCategoryId || !currentCategories.length) return 0;
    const subs = currentCategories.flatMap((c) => c.subCategories || []);
    return subs.find((s) => String(s.id) === String(watchedSubCategoryId))?._count?.products ?? 0;
  }, [watchedSubCategoryId, currentCategories]);

  // Nom de la catégorie parente mémorisé de manière stable
  const parentCatName = useMemo(
    () => currentCategories.find((c) => String(c.id) === selectedCategory)?.name ?? '',
    [currentCategories, selectedCategory],
  );

  // Gestionnaire de soumission lié à l'événement onSubmit du formulaire
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (isPending || isSubmitting) return;

    startTransition(async () => {
      try {
        setIsSubmitting(true);
        setIsSuccess(false);
        setErrorMsg(null);

        // 1. Laisse le hook préparer les données (Append des Blobs audio/images dans le DOM)
        prepareFileInputs();

        // 2. Récupère le snapshot frais des éléments du formulaire
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);

        // 3. Déclenche l'action serveur adéquate selon le mode courant
        const response = mode === 'create' 
          ? await createProductAction(formData)
          : await updateProductAction(formData);

        // 4. Traite la réponse JSON renvoyée par le serveur optimisé
        if (response.success) {
          toast.success(mode === 'create' ? "Produit créé avec succès !" : "Produit modifié !");
          setIsSuccess(true);
          
          router.push('/products');
          router.refresh();
        } else {
          toast.error(response.error || "Une erreur est survenue");
          setErrorMsg(response.error || "Une erreur est survenue");
        }
      } catch (smth) {
        console.error("Erreur critique lors de l'interception de la soumission: ", smth);
        toast.error("Impossible de finaliser l'enregistrement.");
        setErrorMsg((smth as any)?.message || "Impossible de finaliser l'enregistrement.");
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  // Écran de chargement initial
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white" role="status" aria-live="polite">
        <FaSpinner className="animate-spin text-green-600 mb-4" size={40} />
        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Vérification de la session...</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="min-h-screen bg-slate-50 pb-20 font-sans relative antialiased dynamic-form-submit"
    >
      {/* Inputs cachés de synchronisation minimale requis pour les Server Actions */}
      <input type="hidden" name="id" value={initialData?.id || ''} />
      <input type="hidden" name="categoryId" value={watchedCategoryId || ''} />
      <input type="hidden" name="subCategoryId" value={watchedSubCategoryId || ''} />
      <input type="hidden" name="categoryLabel" value={watchedCategoryLabel || ''} />
      <input type="hidden" name="existingImages" value={JSON.stringify(existingImages ?? [])} />

      {/* Overlay de soumission global */}
      <SubmitOverlay isSubmitting={isSubmitting || isPending} isSuccess={isSuccess} />

      {/* Header persistant */}
      <header className="bg-white p-4 sticky top-0 z-30 shadow-sm border-b border-slate-100 execution-context">
        <div className="flex items-center gap-4 mb-4">
          <button 
            type="button" 
            onClick={goBack} 
            disabled={isPending}
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
            aria-label="Étape précédente"
          >
            <FaArrowLeft className="text-slate-600" />
          </button>
          <h1 className="font-black text-slate-800 uppercase tracking-tight italic">
            {mode === 'create' ? 'Nouveau Flux' : 'Modifier Produit'}
          </h1>
        </div>
        <ProductStepper currentStep={step} />
      </header>

      {/* Bannière d'erreur résiliente */}
      {errorMsg && (
        <div className="mx-6 mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black border border-red-100 uppercase tracking-widest raw-error" role="alert">
          {errorMsg}
        </div>
      )}

      <main className="p-6 max-w-md mx-auto step-container">
        {/* Fichiers réels attachés au DOM pour la transmission Multipart binaire */}
        <input ref={audioInputRef} type="file" name="audio" accept="audio/*" className="hidden-file-input hidden" />
        <input ref={imagesInputRef} type="file" name="images" accept="image/*" multiple className="hidden-file-input hidden" />

        {step === 1 && (
          <StepCategories
            categories={currentCategories}
            selectedCategory={selectedCategory}
            onSelect={selectCategory}
          />
        )}

        {step === 2 && (
          <StepSubCategories
            subCategories={metadata.getSubCategories(selectedCategory)}
            standardPriceMap={metadata.standardPriceMap}
            parentCategoryName={parentCatName}
            zoneId={metadata.zoneId}
            onSelect={selectSubCategory}
            onBack={resetCategory}
          />
        )}

        {step === 3 && (
          <StepPhotos
            existingImages={existingImages}
            newPreviews={newPreviews}
            totalImages={totalImages}
            onAddImage={addImage}
            onRemoveExisting={removeExistingImage}
            onRemoveNew={removeNewImage}
            onNext={goNext}
          />
        )}

        {step === 4 && (
          <StepDetails
            form={form}
            defaultPriceInfo={defaultPriceInfo}
            competitorCount={competitorCount}
            onNext={goNext}
          />
        )}

        {step === 5 && (
          <StepAudio onRecordingComplete={setAudioBlob} onNext={goNext} />
        )}

        {step === 6 && (
          <StepReview
            mode={mode}
            name={getValues('name')}
            categoryLabel={watchedCategoryLabel || getValues('categoryLabel')}
            description={getValues('description')}
            price={getValues('price')}
            quantity={getValues('quantityForSale')}
            unit={getValues('unit')}
            firstPreview={newPreviews[0] || null}
            firstExistingImage={existingImages[0] || null}
            hasAudio={!!audioBlob}
            isSubmitting={isSubmitting || isPending}
            onSubmit={() => formRef.current?.requestSubmit()}
          />
        )}
      </main>
    </form>
  );
}