import React from 'react';
import { normalizeAssetUrl } from '@/lib/assetUrl';
import Image from 'next/image';
import ProductDetailClient from '@/components/product/ProductDetailClient';
import { fetchProductByIdServer } from '@/app/actions/publicProduct.safe.server';
import {
  FaBoxOpen,
  FaPause,
  FaPlay,
  FaWhatsapp,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';


// --- TYPES ---
interface LocalNames {
  [key: string]: string;
}

interface Product {
  id: string;
  price: number;
  quantityForSale: number;
  unit: string;
  audioUrl?: string;
  description?: string;
  localNames?: LocalNames;
}

interface ProductCardProps {
  product: Product;
  audio: {
    isPlaying: boolean;
    toggle: () => void;
    ref: React.RefObject<HTMLAudioElement | null>;
  };
  onShare: () => void;
}

// --- SOUS-COMPOSANTS EXTRAITS ---

const StatBox = ({ label, value, unit }: { label: string; value: string | number; unit: string }) => (
  <div className="flex-1 bg-slate-50 p-6 rounded-4xl border border-slate-100">
    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</p>
    <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
      {value} <span className="text-sm font-bold text-slate-400">{unit}</span>
    </p>
  </div>
);

const AudioPlayer = ({ url, audio }: { url: string; audio: ProductCardProps['audio'] }) => (
  <div className="mb-8">
    <audio ref={audio.ref} src={`/uploads/audio/${url}`} onEnded={audio.toggle} />
    <button 
      onClick={audio.toggle}
      className={`w-full p-6 rounded-4xl flex items-center gap-6 transition-all duration-300 ${
        audio.isPlaying 
          ? 'bg-green-600 text-white shadow-xl shadow-green-200 scale-[1.02]' 
          : 'bg-slate-900 text-white shadow-lg shadow-slate-200'
      }`}
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${
        audio.isPlaying ? 'bg-white text-green-600' : 'bg-white/10 text-white'
      }`}>
        {audio.isPlaying ? <FaPause size={24} /> : <FaPlay size={24} className="ml-1" />}
      </div>
      <div className="flex-1 text-left">
        <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Description Vocale</p>
        <p className="text-lg font-bold leading-tight">Écouter les détails</p>
      </div>
    </button>
  </div>
);



function ProductContentCard({ product, audio, onShare }: ProductCardProps) {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-6 md:p-10 border border-slate-100">
      
      {/* 1. Stats Grid */}
      <div className="flex items-stretch gap-4 mb-8">
        <StatBox label="Prix Unitaire" value={product.price} unit="FCFA" />
        <StatBox label="quantityForSale" value={product.quantityForSale} unit={product.unit} />
      </div>

      {/* 2. Audio Section */}
      {product.audioUrl && <AudioPlayer url={product.audioUrl} audio={audio} />}

      {/* 3. Description & Local Names */}
      <div className="mb-8">
        <h3 className="text-lg font-black text-slate-900 uppercase italic mb-4 flex items-center gap-2">
          <FaBoxOpen className="text-slate-300" /> Détails
        </h3>
        <div className="bg-slate-50 rounded-3xl p-6 text-slate-600 text-sm leading-relaxed font-medium">
          {product.description || (
            <p className="italic opacity-50">Aucune description disponible. Écoutez l'audio.</p>
          )}
          
          {product.localNames && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-2">
              {Object.entries(product.localNames).map(([lang, name]) => (
                <span key={lang} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase text-slate-500">
                  {lang}: <span className="text-slate-900">{name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Action */}
      <button 
        onClick={onShare}
        className="w-full bg-[#25D366] text-white p-5 rounded-4xl flex items-center justify-center gap-3 shadow-xl shadow-green-100 hover:bg-[#20bd5a] transition-all active:scale-95"
      >
        <FaWhatsapp size={28} />
        <span className="text-lg font-black uppercase tracking-wider">Partager</span>
      </button>

      <p className="mt-8 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
        Réf: {product.id.slice(-8)}
      </p>
    </div>
  );
}
// Helper components for splitting logic/UI
function ProductHeader({ product, isOwner, onEdit, onDelete, router }: any) {
  return (
    <div className="relative h-[50vh] md:h-[60vh] w-full bg-slate-900">
        <Image 
          src={product.images && product.images.length > 0 
            ? normalizeAssetUrl(product.images[0], 'products')
            : 'https://images.unsplash.com/photo-1590251142562-b9e76100570b?q=80&w=600'
          } 
          alt={product.categoryLabel}
          fill
          className="object-cover opacity-90"
        />
      <div className="absolute inset-0 bg-linear-to-t from-[#0F172A] via-transparent to-transparent" />
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
        <button onClick={() => router.back()} className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-black/40 transition-all">
          <FaArrowLeft />
        </button>
        {isOwner && (
          <div className="flex gap-3">
            <button onClick={onEdit} className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-900 shadow-lg hover:scale-105 transition-all">
              <FaEdit />
            </button>
            <button onClick={onDelete} className="w-12 h-12 bg-red-500/90 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-all">
              <FaTrash size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mb-3 ${
              product.quantityForSale > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {product.quantityForSale > 0 ? <FaCheckCircle /> : <FaTimesCircle />}
              {product.quantityForSale > 0 ? 'Disponible' : 'Épuisé'}
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none shadow-black drop-shadow-lg">
              {product.categoryLabel}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}



export default async function ProductDetailPage({ params }: { params: { productId: string } }) {
  const product = await fetchProductByIdServer(params.productId);
  if (!product) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC]">
        <FaBoxOpen className="text-6xl text-slate-200 mb-4" />
        <h2 className="text-xl font-black text-slate-800 uppercase italic mb-2">Produit Introuvable</h2>
      </div>
    );
  }

  return <ProductDetailClient product={product} productId={params.productId} />;
}