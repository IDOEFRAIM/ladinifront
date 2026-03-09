import React from 'react';
import ProductFlow from '@/components/utils/productorProductFlow';
import { fetchProductByIdServer } from '@/app/actions/publicProduct.server';

export default async function EditPage({ params }: { params: { productId: string } | Promise<{ productId: string }> }) {
  const resolvedParams = await params;
  const productId = String(resolvedParams?.productId ?? '').trim();
  if (!productId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-10">
        <div className="text-gray-400 text-lg">Identifiant produit invalide</div>
      </div>
    );
  }

  const product = await fetchProductByIdServer(productId);
  if (!product) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-10">
        <div className="text-gray-400 text-lg">Produit introuvable</div>
      </div>
    );
  }

  return (
    <div className="p-4 animate-in fade-in duration-500">
      <ProductFlow mode="edit" initialData={product} />
    </div>
  );
}