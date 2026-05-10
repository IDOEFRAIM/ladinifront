"use client";

import React, { useMemo } from 'react';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';
import { createProductAction, updateProductAction } from '@/app/actions/createProductAction';
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

  const { watch } = form;
  const watchedName = watch('name');
  const watchedCategory = watch('category');
  const watchedCategoryLabel = watch('categoryLabel');
  const watchedCategoryId = watch('categoryId');
  const watchedDescription = watch('description');
  const watchedPrice = watch('price');
  const watchedQuantity = watch('quantity');
  const watchedUnit = watch('unit');

  const { categories, standardPriceMap, zoneId, getSubCategories } = metadata;

  // Derive competitor count for selected subcategory
  const competitorCount = useMemo(() => {
    if (!watchedCategoryId) return 0;
    const subs = categories.flatMap((c) => c.subCategories);
    return subs.find((s) => String(s.id) === String(watchedCategoryId))?._count?.products ?? 0;
  }, [watchedCategoryId, categories]);

  // Current parent category name for subcategory step
  const parentCatName = useMemo(
    () => categories.find((c) => String(c.id) === selectedCategory)?.name ?? '',
    [categories, selectedCategory],
  );

  // ── Loading screen ───────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <FaSpinner className="animate-spin text-green-600 mb-4" size={40} />
        <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Session en cours...</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <form
      ref={formRef}
      action={mode === 'create' ? createProductAction : updateProductAction}
      className="min-h-screen bg-slate-50 pb-20 font-sans relative"
    >
      {/* Hidden canonical inputs */}
      <input type="hidden" name="id" value={initialData?.id || ''} />
      <input type="hidden" name="name" value={watchedName || ''} />
      <input type="hidden" name="category" value={watchedCategory || ''} />
      <input type="hidden" name="categoryLabel" value={watchedCategoryLabel || ''} />
      <input type="hidden" name="categoryId" value={watchedCategoryId || ''} />
      <input type="hidden" name="description" value={watchedDescription || ''} />
      <input type="hidden" name="price" value={watchedPrice || ''} />
      <input type="hidden" name="quantity" value={watchedQuantity || ''} />
      <input type="hidden" name="unit" value={watchedUnit || 'KG'} />

      {/* Overlay */}
      <SubmitOverlay isSubmitting={isSubmitting} isSuccess={isSuccess} />

      {/* Header */}
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

      {/* Error banner */}
      {errorMsg && (
        <div className="mx-6 mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black border border-red-100 uppercase tracking-widest">
          {errorMsg}
        </div>
      )}

      <div className="p-6 max-w-md mx-auto">
        {/* Hidden file inputs for native form submission */}
        <input ref={audioInputRef} type="file" name="audio" accept="audio/*" className="hidden" />
        <input ref={imagesInputRef} type="file" name="images" accept="image/*" multiple className="hidden" />

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
          <StepReview
            mode={mode}
            name={watchedName}
            categoryLabel={watchedCategoryLabel}
            description={watchedDescription}
            price={watchedPrice}
            quantity={watchedQuantity}
            unit={watchedUnit}
            firstPreview={newPreviews[0] || null}
            firstExistingImage={existingImages[0] || null}
            hasAudio={!!audioBlob}
            isSubmitting={isSubmitting}
            onSubmit={prepareAndSubmit}
          />
        )}
      </div>
    </form>
  );
}