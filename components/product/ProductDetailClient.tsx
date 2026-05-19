"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  FaArrowLeft, FaEdit, FaTrash, FaWhatsapp, FaPlay, FaPause, 
  FaSpinner, FaCheckCircle, FaTimesCircle, FaBoxOpen
} from 'react-icons/fa';
import ProductFlow from '@/components/utils/productorProductFlow'; 
import { useAuth } from '@/hooks/useAuth';
import { deleteProduct } from '@/services/producer.service';
import { toast } from 'react-hot-toast';

export default function ProductDetailClient({ product, productId }: any) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Safe initialization of Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(
    typeof window !== 'undefined' && product?.audioUrl ? new Audio(product.audioUrl) : null
  );

  // Check ownership
  const isOwner = user?.id && product?.producer?.userId && user.id === product.producer.userId;

  // Optimized Delete with loading states and error boundaries
  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;
    if (!user?.id) return toast.error("Vous devez être connecté");

    try {
      setLoading(true);
      const res = await deleteProduct(productId);
      if (res.success) {
        toast.success("Produit supprimé");
        router.replace('/products');
      } else {
        toast.error(res.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      toast.error("Une erreur réseau est survenue");
    } finally {
      setLoading(false);
    }
  };

  // Safe Share utility using encoded WhatsApp API URL
  const handleShare = () => {
    const text = `*${product.categoryLabel}*\nPrix: ${product.price} FCFA / ${product.unit}\nStock: ${product.stock} ${product.unit}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Clean Audio toggle mechanism
  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => toast.error("Impossible de lire l'audio"));

      // Reset state automatically when audio finishes playing
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      <FaSpinner className="animate-spin text-4xl text-green-600 mb-4" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Chargement...</p>
    </div>
  );

  if (isEditing) return <ProductFlow mode="edit" initialData={product} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Navbar section */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center text-slate-600 font-medium gap-2 hover:text-slate-900 transition">
            <FaArrowLeft /> <span>Retour</span>
          </button>
          
          {isOwner && (
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-sm font-semibold transition">
                <FaEdit /> Modifier
              </button>
              <button onClick={handleDelete} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-xl text-sm font-semibold transition">
                <FaTrash /> Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main product detail container */}
      <div className="max-w-3xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
          
          {/* Product Header & Optional Image */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {product.imageUrl && (
              <div className="relative w-full md:w-48 h-48 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                <Image src={product.imageUrl} alt={product.categoryLabel} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                {product.status === 'available' ? 'Disponible' : 'Rupture'}
              </span>
              <h1 className="text-3xl font-black text-slate-900">{product.categoryLabel}</h1>
              <p className="text-2xl font-extrabold text-green-600">{product.price} <span className="text-sm font-semibold text-slate-500">FCFA / {product.unit}</span></p>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Details & Stock Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
              <FaBoxOpen className="text-slate-400 text-xl" />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Stock disponible</p>
                <p className="text-base font-bold text-slate-800">{product.stock} {product.unit}</p>
              </div>
            </div>
            
            {/* Conditional Voice Note Player */}
            {product.audioUrl && (
              <button onClick={toggleAudio} className={`p-4 rounded-2xl flex items-center gap-3 transition text-left w-full ${isPlaying ? 'bg-green-50 border border-green-200' : 'bg-slate-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPlaying ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {isPlaying ? <FaPause /> : <FaPlay className="ml-0.5" />}
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Note Vocale</p>
                  <p className="text-base font-bold text-slate-800">{isPlaying ? "En cours..." : "Écouter la description"}</p>
                </div>
              </button>
            )}
          </div>

          {/* Share Button Interaction */}
          <button 
            onClick={handleShare} 
            className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm transition"
          >
            <FaWhatsapp className="text-xl" /> Partager sur WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}