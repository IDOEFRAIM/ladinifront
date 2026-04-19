"use client";

import React, { useState, useEffect, useRef } from 'react';
import { normalizeAssetUrl } from '@/lib/assetUrl';
import { createProductAction, updateProductAction } from '@/app/actions/createProductAction';
import { getCategories, getStandardPrices } from '@/services/dr-governance.service';
import { useZone } from '@/context/ZoneContext';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { 
  FaArrowLeft, FaCamera, FaCheck, FaTrash, FaSpinner,
  FaSeedling, FaCarrot, FaDrumstickBite, FaBoxOpen, FaTractor, FaMicrophone, FaSave
} from 'react-icons/fa';
import AudioRecorder from '@/components/audio/voiceRecorder';
import { useAuth } from '@/hooks/useAuth';

// --- CONFIGURATION ---
const MAX_IMAGES = 3; 
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ProductFlowProps {
  mode: 'create' | 'edit';
  initialData?: any; 
}

interface ProductFormData {
  category: string;
  categoryLabel: string;
  categoryId?: string;
  name: string;
  description: string;
  price: string;
  unit: string;
  quantity: string;
}

export default function ProductFlow({ mode, initialData }: ProductFlowProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const isDev = process.env.NODE_ENV !== 'production';
  const [dynamicCats, setDynamicCats] = useState<any[]>([]);
  const { zoneId } = useZone();
  const [defaultPriceInfo, setDefaultPriceInfo] = useState<{ price?: number; unit?: string } | null>(null);
  const [standardPriceMap, setStandardPriceMap] = useState<Record<string, { price: number; unit?: string }>>({});
  
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 6; // 1:cat, 2:subcat, 3:photos, 4:details, 5:audio, 6:review
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);

  // React Hook Form - On initialise vide, le useEffect fera le travail
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      category: '',
      categoryLabel: '',
      name: '',
      description: '',
      price: '',
      unit: 'KG',
      quantity: '',
    }
  });

  // Watch values for UI
  const watchedCategory = watch('category');
  const watchedCategoryLabel = watch('categoryLabel');
  const watchedCategoryId = watch('categoryId');
  const watchedPrice = watch('price');
  const watchedQuantity = watch('quantity');
  const watchedUnit = watch('unit');
  const watchedName = watch('name');
  const watchedDescription = watch('description');

  // File & Audio State - On initialise vide pour éviter les conflits
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // --- HYDRATATION DES DONNÉES (MODE EDIT) ---
  useEffect(() => {
    if (initialData && mode === 'edit') {
      // 1. Hydrate le formulaire avec reset() pour écraser les defaultValues
    if (isDev) console.log("Hydrating form with initial data:", initialData?.categoryLabel || initialData?.category);

    reset({
      // Use values from DB when available
      category: initialData.category || '',
      categoryLabel: initialData.categoryLabel || '',
      categoryId: initialData.categoryId || initialData.subCategoryId || undefined,
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price?.toString() || '',
        unit: initialData.unit || 'KG',
        quantity: (initialData.quantityForSale || initialData.quantity)?.toString() || '',
      });

        // Ensure the selectedCategory state reflects the existing product's category
        try {
          if (initialData.category) setSelectedCategory(String(initialData.category));
          else if (initialData.categoryId) {
            // if only subcategory is present, attempt to derive parent later when categories load
            setSelectedCategory(null);
          }
        } catch {}
      // 2. Hydrate les images existantes
      if (initialData.images && Array.isArray(initialData.images)) {
        setExistingImages(initialData.images);
      }
    }
  }, [initialData, mode, reset]);

  // Load categories from governance service and adapt to zone
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getCategories();
        if (mounted && res?.success && Array.isArray(res.data)) {
          // Filter out subcategories blocked for current zone
          const cats = res.data.map((c: any) => ({
            ...c,
            subCategories: Array.isArray(c.subCategories) ? c.subCategories.filter((s: any) => {
              if (!zoneId) return true;
              return !s.blockedZoneIds?.includes(zoneId);
            }) : [],
          })).filter((c: any) => c.subCategories.length > 0);
          setDynamicCats(cats);
        }
      } catch (e) {
        console.error('Failed to load categories for product flow', e);
      }
    })();
    return () => { mounted = false; };
  }, [zoneId]);

  // If we're editing and categories have loaded, infer and select the parent category
  useEffect(() => {
    try {
      if (mode === 'edit' && initialData && dynamicCats.length > 0) {
        const subId = initialData.categoryId || initialData.subCategoryId || initialData.subCategory?.id;
        if (subId) {
          // find parent category that contains this subcategory
          const parent = dynamicCats.find((c: any) => Array.isArray(c.subCategories) && c.subCategories.some((s: any) => String(s.id) === String(subId)));
          if (parent) {
            const sub = parent.subCategories.find((s: any) => String(s.id) === String(subId));
            setSelectedCategory(String(parent.id));
            // populate form values if not already set
            try { setValue('category', String(parent.id)); } catch {}
            try { setValue('categoryId', String(subId)); } catch {}
            try { setValue('categoryLabel', `${parent.name} / ${sub?.name || ''}`); } catch {}
            // show the subcategory step so the user sees the selection
            setStep(2);
          }
        }
      }
    } catch (err) { /* ignore */ }
  }, [dynamicCats, initialData, mode, setValue]);

  // Load default price for selected subcategory in current zone
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!zoneId || !watchedCategoryId) {
        setDefaultPriceInfo(null);
        return;
      }
      try {
        const prices = await getStandardPrices(zoneId);
        if (mounted && prices?.success && Array.isArray(prices.data)) {
          if (isDev) console.log('[product-flow] getStandardPrices (default lookup)', { zoneId, watchedCategoryId, data: prices.data });
          const p = prices.data.find((x: any) => String(x.subCategoryId) === String(watchedCategoryId) || String(x.subCategory?.id) === String(watchedCategoryId));
          if (p) {
            if (isDev) console.log('[product-flow] matched standard price (default)', p);
            const pp: any = p;
            const priceVal = pp.pricePerUnit ?? pp.price_per_unit ?? pp.price ?? null;
            const unitVal = pp.unit ?? pp?.unit ?? undefined;
            if (priceVal != null) setDefaultPriceInfo({ price: Number(priceVal), unit: unitVal });
            else setDefaultPriceInfo(null);
          } else setDefaultPriceInfo(null);
        }
      } catch (e) {
        console.error('Failed to load standard price', e);
      }
    })();
    return () => { mounted = false; };
  }, [zoneId, watchedCategoryId]);

  // Load standard prices map for current zone to display on subcategory cards
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!zoneId) {
        setStandardPriceMap({});
        return;
      }
      try {
        const resp = await getStandardPrices(zoneId);
        if (mounted && resp?.success && Array.isArray(resp.data)) {
          if (isDev) console.log('[product-flow] getStandardPrices (map)', { zoneId, data: resp.data });
          const map: Record<string, { price: number; unit?: string }> = {};
          resp.data.forEach((p: any) => {
            const id = p.subCategoryId ?? p.subCategory?.id;
            const key = id != null ? String(id) : null;
            const pp: any = p;
            const priceVal = pp.pricePerUnit ?? pp.price_per_unit ?? pp.price ?? null;
            const unitVal = pp.unit ?? pp?.unit ?? undefined;
            if (key && priceVal != null) map[key] = { price: Number(priceVal), unit: unitVal };
          });
          if (isDev) console.log('[product-flow] built standardPriceMap', map);
          setStandardPriceMap(map);
        }
      } catch (err) {
        console.error('Failed to load standard prices map', err);
      }
    })();
    return () => { mounted = false; };
  }, [zoneId, dynamicCats]);

  // If a default price exists for the chosen subcategory+zone, prefill the price and unit
  useEffect(() => {
    if (!defaultPriceInfo) return;
    // Don't overwrite user-entered values
    const current = parseFloat(String(watchedPrice || '0'));
    if (!current || current <= 0) {
      try { setValue('price', String(defaultPriceInfo.price || '')); } catch {};
    }
    if (defaultPriceInfo.unit) {
      try { setValue('unit', defaultPriceInfo.unit); } catch {};
    }
  }, [defaultPriceInfo, setValue, watchedPrice]);

  // Nettoyage des URLs de prévisualisation
  useEffect(() => {
    return () => newPreviews.forEach(url => URL.revokeObjectURL(url));
  }, [newPreviews]);

  // --- SAUVEGARDE ---
  // Prepare file inputs (images/audio) and submit the native form to the server action.
  const prepareAndSubmit = async () => {
    if (authLoading) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      // Ensure required fields are present before building FormData
      // If categoryLabel is missing but categoryId + dynamicCats are available, derive it
      if (!watchedCategoryLabel && watchedCategoryId) {
        const cat = dynamicCats.find(c => c.subCategories?.some((s: any) => s.id === watchedCategoryId));
        const sub = cat?.subCategories?.find((s: any) => s.id === watchedCategoryId);
        console.log(sub)
        if (cat && sub) {
          setValue('categoryLabel', `${cat.name} / ${sub.name}`);
        }
      }

      // If price is missing but a default price exists, prefill it
      if ((!watchedPrice || Number(watchedPrice) <= 0) && defaultPriceInfo?.price) {
        try { setValue('price', String(defaultPriceInfo.price)); } catch {}
        if (defaultPriceInfo.unit) try { setValue('unit', defaultPriceInfo.unit); } catch {}
      }

      // Final client-side validation to avoid server INVALID_FORM
      const finalPrice = parseFloat(String(watch('price') || '0'));
      const finalQty = parseFloat(String(watch('quantity') || '0'));
      const finalName = String(watch('name') || '');
      const finalCatLabel = String(watch('categoryLabel') || '');
      if (!finalName || !finalCatLabel || !finalQty || finalPrice <= 0) {
        setIsSubmitting(false);
        setErrorMsg('Veuillez compléter le nom, la catégorie, la quantité et un prix valide avant de publier.');
        return;
      }
      // Populate images input from `newImages`
      if (imagesInputRef.current) {
        const dt = new DataTransfer();
        newImages.forEach((f) => dt.items.add(f));
        imagesInputRef.current.files = dt.files;
      }

      // Populate audio input from `audioBlob`
      if (audioBlob && audioInputRef.current) {
        const audioFile = new File([audioBlob], 'desc_vocale.webm', { type: 'audio/webm' });
        const dt2 = new DataTransfer();
        dt2.items.add(audioFile);
        audioInputRef.current.files = dt2.files;
      }

      // Ensure hidden id field exists (for edit mode)
      if (mode === 'edit' && initialData?.id) {
        const idInput = formRef.current?.querySelector('input[name="id"]') as HTMLInputElement | null;
        if (idInput) idInput.value = String(initialData.id);
      }

      // Submit the native form so the `action` server function receives the multipart FormData
      formRef.current?.requestSubmit?.();
      // Safety fallback: if the server action doesn't navigate away or a response isn't received,
      // clear the submitting overlay after a short timeout so the UI doesn't get stuck.
      try {
        const clearTimeoutId = setTimeout(() => {
          setIsSubmitting(false);
          setIsSuccess(true);
          // hide success after brief moment
          setTimeout(() => setIsSuccess(false), 2000);
        }, 4000);
        // store id on the form so we could clear it elsewhere if needed
        if (formRef.current) (formRef.current as any)._autoClearSubmitTimeout = clearTimeoutId;
      } catch {}
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Erreur préparation du formulaire');
    }
  };

  // --- ÉCRAN CHARGEMENT ---
  if (authLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <FaSpinner className="animate-spin text-green-600 mb-4" size={40} />
            <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Session en cours...</p>
        </div>
    );
  }

  return (
    <form ref={formRef} action={mode === 'create' ? createProductAction : updateProductAction} className="min-h-screen bg-slate-50 pb-20 font-sans relative">
      {/* Hidden canonical inputs to guarantee server action receives values */}
      <input type="hidden" name="id" value={initialData?.id || ''} />
      <input type="hidden" name="name" value={watchedName || ''} />
      <input type="hidden" name="category" value={watchedCategory || ''} />
      <input type="hidden" name="categoryLabel" value={watchedCategoryLabel || ''} />
      <input type="hidden" name="categoryId" value={watchedCategoryId || ''} />
      <input type="hidden" name="description" value={watchedDescription || ''} />
      <input type="hidden" name="price" value={watchedPrice || ''} />
      <input type="hidden" name="quantity" value={watchedQuantity || ''} />
      <input type="hidden" name="unit" value={watchedUnit || 'KG'} />
      
      {/* OVERLAY SUCCÈS / ENVOI */}
      {(isSubmitting || isSuccess) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-6">
          <div className="bg-white w-full max-w-xs rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            {!isSuccess ? (
              <>
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase italic">Envoi...</h2>
              </>
            ) : (
              <div className="animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaCheck size={36} className="animate-bounce" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase italic">Terminé !</h2>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white p-4 sticky top-0 z-30 shadow-sm border-b border-slate-100">
        <div className="flex items-center gap-4 mb-4">
          <button
           type="button"
           onClick={() => step > 1 ? setStep(step - 1) : router.back()}
           className="p-2 bg-slate-100 rounded-full">
            <FaArrowLeft className="text-slate-600" />
          </button>
          <h1 className="font-black text-slate-800 uppercase tracking-tight italic">
            {mode === 'create' ? 'Nouveau Flux' : 'Modifier Produit'}
          </h1>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-green-600 h-full transition-all duration-500" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
        {/* Visible stepper */}
        <div className="mt-3 flex items-center justify-between gap-3 text-[10px]">
          {[
            { id: 1, label: 'Catégorie' },
            { id: 2, label: 'Sous-cat.' },
            { id: 3, label: 'Photos' },
            { id: 4, label: 'Détails' },
            { id: 5, label: 'Audio' },
            { id: 6, label: 'Aperçu' },
          ].map(s => (
            <div key={s.id} className={`flex-1 text-center py-1 rounded-md ${step === s.id ? 'bg-green-600 text-white font-black' : 'bg-slate-100 text-slate-500'}`}>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="mx-6 mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black border border-red-100 uppercase tracking-widest">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="p-6 max-w-md mx-auto">
        {/* Hidden audio input to receive programmatic blob attachment */}
        <input ref={audioInputRef} type="file" name="audio" accept="audio/*" className="hidden" />
        {/* Hidden images input to attach selected images to the native form before submit */}
        <input ref={imagesInputRef} type="file" name="images" accept="image/*" multiple className="hidden" />
        
        {/* STEP 1: CATEGORIES */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
              {dynamicCats.length > 0 ? (
              dynamicCats.map(cat => (
                <button type="button" key={cat.id} onClick={() => {
                  setSelectedCategory(String(cat.id));
                  setValue('category', String(cat.id));
                  setValue('categoryLabel', cat.name);
                  setStep(2);
                }} className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center ${selectedCategory === String(cat.id) ? 'border-green-500 bg-white shadow-xl scale-105' : 'border-transparent bg-white/50'}`}>
                  <div className={`text-3xl mb-3 p-4 rounded-full bg-gray-100 text-gray-700`}>{/* icon placeholder */}</div>
                  <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">{cat.name}</span>
                </button>
              ))
            ) : (
              <div className="text-sm text-slate-500">Chargement des catégories...</div>
            )}
          </div>
        )}

        {/* STEP 2: SUBCATEGORIES */}
        {step === 2 && (
          <div>
            <div className="mb-4 flex items-center gap-4">
              <button type="button" onClick={() => { setStep(1); setSelectedCategory(null); setValue('category',''); setValue('categoryLabel',''); }} className="px-3 py-2 bg-slate-100 rounded-xl">← Retour</button>
              <h3 className="font-black">Choisissez une sous-catégorie</h3>
            </div>
                <div className="grid grid-cols-2 gap-4">
              {(dynamicCats.find((c: any) => String(c.id) === selectedCategory)?.subCategories || []).map((sub: any) => {
                const count = sub._count?.products || 0;
                // determine admin average price for this subcategory in current zone
                const key = String(sub.id);
                const p = standardPriceMap[key];
                let avgVal: number | null = null;
                let unit: string | undefined = undefined;
                if (p) { avgVal = Number(p.price); unit = p.unit; }
                else {
                  const spArr = (sub.standardPrices || []);
                  const fallback = spArr.find((sp: any) => String(sp.zone?.id) === String(zoneId));
                  if (fallback) { avgVal = Number(fallback.pricePerUnit); unit = fallback.unit; }
                  else if (spArr.length > 0) { const first = spArr[0]; avgVal = Number(first.pricePerUnit ?? first.price ?? first.pricePerUnit); unit = first.unit; }
                }

                return (
                  <div key={sub.id} className={`p-4 rounded-2xl bg-white shadow-sm border border-slate-100`}>
                    <div className="w-full text-left flex flex-col h-full">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-black text-slate-800">{sub.name}</h3>
                        <div className="text-xs text-slate-400">{sub.parentName || ''}</div>
                      </div>

                      <div className="flex-1 flex flex-col items-start justify-center mt-4">
                        {avgVal != null ? (
                          <>
                            <div className="text-3xl font-black text-green-700">{Number(avgVal).toLocaleString()}</div>
                            <div className="text-xs text-slate-500">Prix moyen conseillé · F/{unit}</div>
                          </>
                        ) : (
                          <div className="text-sm text-slate-500">Prix moyen non renseigné</div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          {/* Counter badge: simplified and centered text for 'Forte demande' */}
                          {count < 2 ? (
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-black text-white" style={{ background: '#bbf7d0' }}>
                              Forte demande
                            </span>
                          ) : count > 10 ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-black text-white" style={{ background: '#fb923c' }}>
                              <span>⚠️</span> Marché concurrentiel
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-black text-white" style={{ background: '#94a3b8' }}>
                              {count} produits
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CTA full-width button at bottom */}
                      <div className="mt-4">
                        <button type="button" onClick={() => { const cat = dynamicCats.find((c: any) => String(c.id) === selectedCategory); setValue('categoryId', String(sub.id)); setValue('categoryLabel', `${cat?.name || ''} / ${sub.name}`); setStep(3); }}
                          className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-center">Vendre</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: PHOTOS */}
        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-10">
            <div className="grid grid-cols-3 gap-3">
              {(existingImages.length + newImages.length < MAX_IMAGES) && (
                <label className="aspect-square bg-slate-200 rounded-3xl border-4 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform">
                  <FaCamera className="text-2xl text-slate-400" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (!file || !ALLOWED_TYPES.includes(file.type)) return;
                     setNewImages(prev => [...prev, file]);
                     setNewPreviews(prev => [...prev, URL.createObjectURL(file)]);
                  }} />
                </label>
              )}
              {/* Existing */}
              {existingImages.map((url, i) => (
                <div key={`ex-${i}`} className="relative aspect-square rounded-3xl overflow-hidden border-2 border-slate-200">
                  <img src={normalizeAssetUrl(url, 'products')} className="w-full h-full object-cover" alt="prev" />
                  <button type="button" onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full"><FaTrash size={10}/></button>
                </div>
              ))}
              {/* New */}
              {newPreviews.map((src, i) => (
                <div key={`nw-${i}`} className="relative aspect-square rounded-3xl overflow-hidden border-4 border-green-500">
                  <img src={src} className="w-full h-full object-cover" alt="new" />
                  <button type="button" onClick={() => {
                    setNewImages(prev => prev.filter((_, idx) => idx !== i));
                    setNewPreviews(prev => prev.filter((_, idx) => idx !== i));
                  }} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full"><FaTrash size={10}/></button>
                </div>
              ))}
            </div>
            <button type="button" disabled={existingImages.length + newImages.length === 0} onClick={() => setStep(4)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl disabled:opacity-30">Continuer</button>
          </div>
        )}

        {/* STEP 4: DETAILS (NAME, PRICE, QTY) */}
        {step === 4 && (
          <div className="space-y-6 animate-in slide-in-from-right-10">
            
            {/* NAME INPUT */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block">Nom du produit</label>
              <input 
                type="text" 
                placeholder="Ex: Maïs blanc de Bama" 
                className="w-full text-xl font-black bg-transparent border-b-4 border-slate-100 focus:border-green-500 outline-none pb-2" 
                {...register('name', { required: true })}
              />
            </div>

            {/* DESCRIPTION INPUT */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block">Description</label>
              <textarea 
                placeholder="Décrivez votre produit (qualité, origine, etc.)" 
                rows={3}
                className="w-full text-sm font-medium bg-transparent border-b-4 border-slate-100 focus:border-green-500 outline-none pb-2 resize-none" 
                {...register('description')}
              />
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block">Quantité disponible</label>
              <div className="flex gap-4">
                <input 
                  type="number" 
                  placeholder="0" 
                  className="flex-1 text-3xl font-black bg-transparent border-b-4 border-slate-100 focus:border-green-500 outline-none pb-2" 
                  {...register('quantity', { required: true })}
                />
                <select 
                  className="bg-slate-100 font-black rounded-2xl px-4 text-xs outline-none" 
                  {...register('unit')}
                >
                  <option value="KG">KG</option>
                  <option value="SAC">SAC</option>
                  <option value="TONNE">TONNE</option>
                  <option value="UNITÉ">UNITÉ</option>
                </select>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block">Prix unitaire (FCFA)</label>
              <div className="relative">
                <input 
                  type="number" 
                  placeholder="0" 
                  className="w-full text-3xl font-black bg-transparent border-b-4 border-slate-100 focus:border-green-500 outline-none pb-2" 
                  {...register('price', { required: true })}
                />
                <span className="absolute right-0 bottom-3 font-black text-slate-300">F</span>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Prix unitaire (F/{watchedUnit})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 500"
                  className="w-full text-3xl font-black bg-transparent border-b-4 border-slate-100 focus:border-green-500 outline-none pb-2"
                  {...register('price', { required: true })}
                />

                {/* Admin reference & indicator */}
                {defaultPriceInfo && (
                  (() => {
                    const avg = Number(defaultPriceInfo.price || 0);
                    const unit = defaultPriceInfo.unit || watchedUnit || 'KG';
                    const entered = parseFloat(String(watchedPrice || '0')) || 0;
                    const ratio = avg > 0 ? entered / avg : 1;
                    const status = ratio >= 0.9 && ratio <= 1.1 ? 'in-range' : (ratio >= 0.75 && ratio <= 1.25 ? 'warn' : 'out');
                    const barPos = Math.min(100, Math.max(0, (entered / Math.max(avg * 1.5, 1)) * 100));
                    const selectedSub = dynamicCats.flatMap((c:any) => c.subCategories || []).find((s:any) => String(s.id) === String(watchedCategoryId));
                    const compCount = selectedSub?._count?.products || 0;
                    return (
                      <div className="mt-3">
                        <div className="text-xs text-slate-500">Prix conseillé (zone): <strong>{avg.toLocaleString()} F/{unit}</strong></div>
                        <div className="w-full h-3 rounded-full bg-slate-100 mt-2 relative overflow-hidden">
                          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg,#16a34a 0%,#f97316 50%,#ef4444 100%)' }} />
                          <div style={{ position: 'absolute', left: `${barPos}%`, top: -6, transform: 'translateX(-50%)' }}>
                            <div style={{ width: 2, height: 14, background: '#111' }} />
                          </div>
                        </div>
                        {entered > 0 && status === 'out' && (
                          <div className="mt-2 text-sm font-black text-red-600">Votre prix s'écarte fortement de la référence locale.</div>
                        )}
                        {entered > 0 && compCount > 10 && entered > avg && (
                          <div className="mt-2 text-sm font-black text-orange-600">Il y a déjà beaucoup de vendeurs, baissez votre prix pour vendre plus vite.</div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
            <button type="button" disabled={!watchedPrice || !watchedQuantity || !watchedName} onClick={() => setStep(5)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest disabled:opacity-40">Suivant</button>
          </div>
        )}

        {/* STEP 5: AUDIO */}
        {step === 5 && (
          <div className="flex flex-col items-center space-y-8 animate-in slide-in-from-right-10 text-center">
            <div className="bg-green-100 text-green-700 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <FaMicrophone size={36} />
            </div>
            <h3 className="font-black text-slate-800 uppercase italic">Message Vocal</h3>
            <AudioRecorder onRecordingComplete={(blob) => setAudioBlob(blob)} />
            <button type="button" onClick={() => setStep(6)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest">Vérifier l'annonce</button>
          </div>
        )}

        {/* STEP 6: REVIEW */}
        {step === 6 && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white">
                <div className="h-52 bg-slate-100 relative">
                    <img 
                      src={newPreviews[0] || normalizeAssetUrl(existingImages[0], 'products')} 
                      className="w-full h-full object-cover" 
                      alt="final" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-4 left-6 text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{watchedCategoryLabel}</p>
                        <h2 className="text-2xl font-black italic">{watchedName || 'Produit sans nom'}</h2>
                        {watchedDescription && <p className="text-xs mt-1 opacity-90 line-clamp-2">{watchedDescription}</p>}
                    </div>
                </div>
                
                <div className="p-8">
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock</p>
                            <p className="text-xl font-black text-slate-800 italic">{watchedQuantity} {watchedUnit}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Prix</p>
                            <p className="text-xl font-black text-green-700 italic">{Number(watchedPrice).toLocaleString()} F</p>
                        </div>
                    </div>

                    {/* INDICATEUR AUDIO */}
                    {audioBlob && (
                        <div className="flex items-center gap-3 mb-8 p-4 bg-green-50 rounded-2xl border border-green-100 animate-in slide-in-from-left-5">
                             <div className="w-10 h-10 bg-green-200 text-green-700 rounded-full flex items-center justify-center shadow-sm">
                                 <FaMicrophone size={16} />
                             </div>
                             <div>
                                <p className="text-[9px] font-black text-green-800 uppercase tracking-widest">Note Vocale</p>
                                <p className="text-xs font-bold text-green-700">Enregistrement prêt à l'envoi</p>
                             </div>
                        </div>
                    )}

                    <button 
                      type="button"
                      onClick={prepareAndSubmit}
                      disabled={isSubmitting || !watchedName || !watchedQuantity || Number(watchedPrice) <= 0}
                      className="w-full bg-green-600 text-white py-6 rounded-[2.2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-green-200 flex items-center justify-center gap-4 hover:bg-green-700 transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
                      {mode === 'create' ? 'Publier' : 'Enregistrer'}
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}