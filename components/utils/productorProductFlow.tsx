'use client';

import React, { useMemo } from 'react';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';
import { useProductForm } from '@/hooks/useProductForm';
import type { ProductFlowProps } from '@/types/product-flow';

import ProductStepper from '@/components/product/ProductStepper';
import SubmitOverlay from '@/components/product/SubmitOverlay';
import StepCategories from '@/components/product/StepCategories';
import StepSubCategories from '@/components/product/StepSubCategories';
import StepPhotos from '@/components/product/StepPhotos';
import StepDetails from '@/components/product/StepDetails';
import StepAudio from '@/components/product/StepAudio';
import StepReview from '@/components/product/StepReview';

// ── SOUS-COMPOSANT OPTIMISÉ POUR LES INPUTS CACHÉS ───────────────────
// Évite de faire re-rendre tout l'arbre de composants à chaque touche pressée
function WatchedInputs({ form, initialId }: { form: any; initialId: string }) {
  const watched = form.watch(); // S'abonne aux changements localement
  return (
    <>
      <input type="hidden" name="id" value={initialId} />
      <input type="hidden" name="name" value={watched.name || ''} />
      <input type="hidden" name="category" value={watched.category || ''} />
      <input type="hidden" name="categoryLabel" value={watched.categoryLabel || ''} />
      <input type="hidden" name="categoryId" value={watched.categoryId || ''} />
      <input type="hidden" name="description" value={watched.description || ''} />
      <input type="hidden" name="price" value={watched.price || ''} />
      <input type="hidden" name="quantity" value={watched.quantity || ''} />
      <input type="hidden" name="unit" value={watched.unit || 'KG'} />
    </>
  );
}

export default function ProductFlow({ mode, initialData }: ProductFlowProps) {
  const ctx = useProductForm(mode, initialData);
  const {
    authLoading, form, step, goBack,
    selectedCategory, selectCategory, selectSubCategory, resetCategory,
    existingImages, newPreviews, totalImages, addImage, removeExistingImage, removeNewImage,
    audioBlob, setAudioBlob,
    defaultPriceInfo,
    isSubmitting, isSuccess, errorMsg,
    formRef, audioInputRef, imagesInputRef,
    prepareAndSubmit, goNext,
    metadata,
  } = ctx;

  const { categories, standardPriceMap, zoneId, getSubCategories } = metadata;

  // 1. Extraction optimisée (on ne surveille au niveau parent QUE le strict nécessaire)
  const watchedCategoryId = form.watch('categoryId');

  // 2. Calcul du nombre de concurrents mémoïsé
  const competitorCount = useMemo(() => {
    if (!watchedCategoryId) return 0;
    const subs = categories.flatMap((c) => c.subCategories);
    return subs.find((s) => String(s.id) === String(watchedCategoryId))?._count?.products ?? 0;
  }, [watchedCategoryId, categories]);

  // 3. Nom de la catégorie parente mémoïsé
  const parentCatName = useMemo(
    () => categories.find((c) => String(c.id) === selectedCategory)?.name ?? '',
    [categories, selectedCategory],
  );

  // ── Écran de chargement initial ───────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-green-600 mb-4" size={40} />
        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Session en cours...</p>
      </div>
    );
  }

  // ── Rendu de l'interface ──────────────────────────────────────────
  return (
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
      className="min-h-screen bg-slate-50 pb-20 font-sans relative"
    >
      {/* ⚡ RENDU ULTRA-PERFORMANT : Les inputs cachés s'auto-gèrent sans notifier le parent */}
      <WatchedInputs form={form} initialId={initialData?.id || ''} />

      {/* Overlay de statut */}
      <SubmitOverlay isSubmitting={isSubmitting} isSuccess={isSuccess} />

      {/* Barre d'en-tête fixée */}
      <div className="bg-white p-4 sticky top-0 z-30 shadow-sm border-b border-slate-100">
        <div className="flex items-center gap-4 mb-4">
          <button type="button" onClick={goBack} className="p-2 bg-slate-100 rounded-full">
            <FaArrowLeft className="text-slate-600" />
          </button>
          <h1 className="font-black text-slate-800 uppercase tracking-tight italic">
            {mode === 'create' ? 'Nouveau Flux' : 'Modifier Produit'}
          </h1>
        </div>
        <ProductStepper currentStep={step} />
      </div>

      {/* Bannière d'erreur contextuelle */}
      {errorMsg && (
        <div className="mx-6 mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black border border-red-100 uppercase tracking-widest">
          {errorMsg}
        </div>
      )}

      <div className="p-6 max-w-md mx-auto">
        {/* Champs de fichiers HTML natifs masqués */}
        <input ref={audioInputRef} type="file" name="audio" accept="audio/*" className="hidden" />
        <input ref={imagesInputRef} type="file" name="images" accept="image/*" multiple className="hidden" />

        {/* Moteur de rendu conditionnel des étapes par état atomique */}
        {step === 1 && (
          <StepCategories
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={selectCategory}
          />
        )}

        {step === 2 && (
          <StepSubCategories
            subCategories={getSubCategories(selectedCategory)}
            standardPriceMap={standardPriceMap}
            parentCategoryName={parentCatName}
            zoneId={zoneId}
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
          // On passe une fonction d'évaluation au moment M plutôt que d'observer en continu
          <StepReviewWrapper
            form={form}
            mode={mode}
            newPreviews={newPreviews}
            existingImages={existingImages}
            audioBlob={audioBlob}
            isSubmitting={isSubmitting}
            prepareAndSubmit={prepareAndSubmit}
          />
        )}
      </div>
    </form>
  );
}

// ── SOUS-COMPOSANT POUR L'ÉTAPE DE REVUE ─────────────────────────────
// S'isole également pour éviter les lags globaux lors de la saisie
function StepReviewWrapper({ 
  form, mode, newPreviews, existingImages, audioBlob, isSubmitting, prepareAndSubmit 
}: { 
  form: any; mode: any; newPreviews: any; existingImages: any; audioBlob: any; isSubmitting: any; prepareAndSubmit: any 
}) {
  const values = form.getValues(); // Récupère les valeurs statiques instantanément sans hook d'écoute réactif
  
  return (
    <StepReview
      mode={mode}
      name={values.name}
      categoryLabel={values.categoryLabel}
      description={values.description}
      price={values.price}
      quantity={values.quantity}
      unit={values.unit}
      firstPreview={newPreviews[0] || null}
      firstExistingImage={existingImages[0] || null}
      hasAudio={!!audioBlob}
      isSubmitting={isSubmitting}
      onSubmit={prepareAndSubmit}
    />
  );
}