"use client";

import React, { useState } from 'react';
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
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const isOwner = user?.id && product?.producer?.userId && user.id === product.producer.userId;

  const handleDelete = async () => {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;
    if (!user?.id) return;
    const res = await deleteProduct(productId);
    if (res.success) {
      toast.success("Produit supprimé");
      router.replace('/products');
    } else {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleShare = () => {
    const text = `*${product.categoryLabel}*\nPrix: ${product.price} FCFA / ${product.unit}\nStock: ${product.stock} ${product.unit}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
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
      {/* Header and content simplified — render product details similar to previous layout */}
      <div className="max-w-3xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-black">{product.categoryLabel}</h1>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow">
            <p className="font-black">Prix: {product.price} F</p>
            <p className="mt-2">Stock: {product.stock} {product.unit}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <button onClick={handleShare} className="w-full bg-[#25D366] text-white p-3 rounded">Partager</button>
          </div>
        </div>
      </div>
    </div>
  );
}
