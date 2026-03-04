// components/Market/ProductCard.tsx

'use client';
import React from 'react';
import { Product } from '@/types/market';
import { useRouter } from 'next/navigation';
import { FaLeaf, FaMapMarkerAlt, FaPlay } from 'react-icons/fa';

interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const router = useRouter();

    const handleViewProduct = () => {
        router.push(`/publicProducts/${product.id}`);
    };

    const available = product.quantityForSale ?? product.stock ?? (product as any).quantity ?? 0;
    const isLowStock = available < 100;

    return (
        <div 
            onClick={handleViewProduct}
            className="group relative bg-white rounded-xl p-4 border border-stone-200 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer flex flex-col h-full"
        >
            {/* IMAGE */}
            <div className="relative h-48 bg-stone-50 rounded-lg mb-4 overflow-hidden flex items-center justify-center group-hover:bg-green-50 transition-colors">
                {product.images && product.images.length > 0 ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                    <FaLeaf className="text-4xl text-stone-300 group-hover:text-green-600 transition-colors" />
                )}
                
                {/* Badge Audio */}
                {product.audioUrl && (
                    <div className="absolute bottom-3 right-3 bg-green-800 text-white p-2 rounded-full shadow-lg">
                        <FaPlay size={10} />
                    </div>
                )}
            </div>

            {/* CONTENU */}
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-bold text-stone-900 leading-tight">
                        {product.name}
                    </h3>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
                        {available} {product.unit}
                    </span>
                </div>

                <div className="flex items-center gap-1 text-stone-400 mb-3">
                    <FaMapMarkerAlt size={10} />
                    <p className="text-xs font-medium">
                        {product.producer?.location || 'Origine inconnue'}
                    </p>
                </div>
                
                <p className="text-2xl font-bold text-green-800 mb-4">
                    {product.price.toLocaleString('fr-FR')} <span className="text-xs text-stone-400 font-medium">XOF</span>
                </p>

                {/* ACTION */}
                <button 
                    onClick={(e) => { e.stopPropagation(); handleViewProduct(); }}
                    className="mt-auto w-full bg-green-800 text-white py-3 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-green-700 transition-colors"
                >
                    Commander
                </button>
            </div>
        </div>
    );
}