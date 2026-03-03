'use client';

import React, { useEffect, useState, use } from 'react';
import axios from 'axios';
import ProductFlow from '@/components/utils/productorProductFlow';

/**
 * PRO TIP: In a large project, explicitly type your params 
 * to match the folder name [productId].
 */
interface PageProps {
  params: Promise<{ productId: string }>;
}

export default function EditPage({ params }: PageProps) {
  // 1. Unwrap the params using React.use()
  // Since your folder is [productId], the key is 'productId'
  const unwrappedParams = use(params);
  const productId = unwrappedParams.productId;

  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Debugging: This will now show the actual ID in your console
    console.log("Current Product ID:", productId);

    async function fetchProduct() {
      if (!productId) {
        setError("L'identifiant du produit est manquant dans l'URL");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await axios.get(`/api/products/${productId}`, { withCredentials: true });
        const data = res.data;
        setProductData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [productId]);

  // Loading State
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-10">
        <div className="text-gray-400 animate-pulse text-lg">Chargement...</div>
      </div>
    );
  }
  
  // Error State
  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-10 text-center">
        <div className="mb-4 text-red-500 text-xl font-semibold"> {error}</div>
        <p className="text-xs text-gray-500 mb-4">ID détecté : {String(productId)}</p>
        <button 
          onClick={() => window.location.reload()}
          className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!productData) return null;

  return (
    <div className="p-4 animate-in fade-in duration-500">
      <ProductFlow mode="edit" initialData={productData} />
    </div>
  );
}