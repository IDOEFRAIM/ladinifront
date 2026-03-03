'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

const CATEGORIES = [
  { id: 'cereales', label: 'Céréales', icon: <FaSeedling />, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'legumes', label: 'Légumes', icon: <FaCarrot />, color: 'bg-green-100 text-green-700' },
  { id: 'animaux', label: 'Animaux', icon: <FaDrumstickBite />, color: 'bg-red-100 text-red-700' },
  { id: 'transforme', label: 'Transformé', icon: <FaBoxOpen />, color: 'bg-purple-100 text-purple-700' },
  { id: 'outils', label: 'Outils', icon: <FaTractor />, color: 'bg-blue-100 text-blue-700' },
];

interface ProductFlowProps {
  mode: 'create' | 'edit';
  initialData?: any; 
}

interface ProductFormData {
  category: string;
  categoryLabel: string;
  name: string;
  description: string;
  price: string;
  unit: string;
  quantity: string;
}

export default function ProductFlow({ mode, initialData }: ProductFlowProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
const foundCat = CATEGORIES.find(c => 
      c.label.toLowerCase() === initialData.categoryLabel?.toLowerCase() ||
      c.id === initialData.category
    );
     console.log("Hydrating form with initial data:", foundCat);

    reset({
      // On utilise l'ID trouvé, sinon on garde ce qu'il y a dans la DB
      category: foundCat ? foundCat.id : (initialData.category || ''),
      categoryLabel: foundCat ? foundCat.label : (initialData.categoryLabel || ''),
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price?.toString() || '',
        unit: initialData.unit || 'KG',
        quantity: (initialData.quantityForSale || initialData.quantity)?.toString() || '',
      });

      // 2. Hydrate les images existantes
      if (initialData.images && Array.isArray(initialData.images)) {
        setExistingImages(initialData.images);
      }
    }
  }, [initialData, mode, reset]);

  // Nettoyage des URLs de prévisualisation
  useEffect(() => {
    return () => newPreviews.forEach(url => URL.revokeObjectURL(url));
  }, [newPreviews]);

  // --- SAUVEGARDE ---
  const onSubmit: SubmitHandler<ProductFormData> = async (formData) => {
    if (authLoading) return;
    
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const data = new FormData();
      data.append('mode', mode);

      if (mode === 'edit') {
        if (!initialData?.id) throw new Error("ID du produit manquant pour la modification");
        data.append('id', initialData.id);
      }
      
      data.append('category', formData.category);
      data.append('categoryLabel', formData.categoryLabel);
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('price', formData.price);
      data.append('unit', formData.unit);
      data.append('quantity', formData.quantity);
      data.append('existingImages', JSON.stringify(existingImages));

      newImages.forEach((file) => data.append('images', file));
      if (audioBlob) {
        data.append('audio', audioBlob, 'desc_vocale.webm');
      }

      const res = await axios({
        url: '/api/products',
        method: mode === 'create' ? 'post' : 'put',
        data: data,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!res || !res.data) {
        throw new Error('Une erreur est survenue.');
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/products'); 
        router.refresh();
      }, 2000);

    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || "Impossible d'enregistrer le produit.");
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
    <div className="min-h-screen bg-slate-50 pb-20 font-sans relative">
      
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
           onClick={() => step > 1 ? setStep(step - 1) : router.back()}
           className="p-2 bg-slate-100 rounded-full">
            <FaArrowLeft className="text-slate-600" />
          </button>
          <h1 className="font-black text-slate-800 uppercase tracking-tight italic">
            {mode === 'create' ? 'Nouveau Flux' : 'Modifier Produit'}
          </h1>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-green-600 h-full transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </div>

      {errorMsg && (
        <div className="mx-6 mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black border border-red-100 uppercase tracking-widest">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="p-6 max-w-md mx-auto">
        
        {/* STEP 1: CATEGORIES */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                onClick={() => { 
                  setValue('category', cat.id);
                  setValue('categoryLabel', cat.label);
                  setStep(2); 
                }}
                className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center ${watchedCategory === cat.id ? 'border-green-500 bg-white shadow-xl scale-105' : 'border-transparent bg-white/50'}`}
              >
                <div className={`text-3xl mb-3 p-4 rounded-full ${cat.color}`}>{cat.icon}</div>
                <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2: PHOTOS */}
        {step === 2 && (
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
                  <img src={url.startsWith('http') ? url : `/uploads/products/${url}`} className="w-full h-full object-cover" alt="prev" />
                  <button onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full"><FaTrash size={10}/></button>
                </div>
              ))}
              {/* New */}
              {newPreviews.map((src, i) => (
                <div key={`nw-${i}`} className="relative aspect-square rounded-3xl overflow-hidden border-4 border-green-500">
                  <img src={src} className="w-full h-full object-cover" alt="new" />
                  <button onClick={() => {
                    setNewImages(prev => prev.filter((_, idx) => idx !== i));
                    setNewPreviews(prev => prev.filter((_, idx) => idx !== i));
                  }} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full"><FaTrash size={10}/></button>
                </div>
              ))}
            </div>
            <button disabled={existingImages.length + newImages.length === 0} onClick={() => setStep(3)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl disabled:opacity-30">Continuer</button>
          </div>
        )}

        {/* STEP 3: DETAILS (NAME, PRICE, QTY) */}
        {step === 3 && (
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
            </div>
            <button disabled={!watchedPrice || !watchedQuantity || !watchedName} onClick={() => setStep(4)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest">Suivant</button>
          </div>
        )}

        {/* STEP 4: AUDIO */}
        {step === 4 && (
          <div className="flex flex-col items-center space-y-8 animate-in slide-in-from-right-10 text-center">
            <div className="bg-green-100 text-green-700 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <FaMicrophone size={36} />
            </div>
            <h3 className="font-black text-slate-800 uppercase italic">Message Vocal</h3>
            <AudioRecorder onRecordingComplete={(blob) => setAudioBlob(blob)} />
            <button onClick={() => setStep(5)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest">Vérifier l'annonce</button>
          </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white">
                <div className="h-52 bg-slate-100 relative">
                    <img 
                      src={newPreviews[0] || (existingImages[0]?.startsWith('http') ? existingImages[0] : `/uploads/products/${existingImages[0]}`)} 
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
                        onClick={handleSubmit(onSubmit)} 
                        disabled={isSubmitting}
                        className="w-full bg-green-600 text-white py-6 rounded-[2.2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-green-200 flex items-center justify-center gap-4 hover:bg-green-700 transition-all"
                    >
                        {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
                        {mode === 'create' ? 'Publier' : 'Enregistrer'}
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}