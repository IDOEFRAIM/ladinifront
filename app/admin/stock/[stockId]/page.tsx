'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    FaChevronLeft, FaLeaf, FaCalendarCheck, FaEuroSign, 
    FaBox, FaChartLine, FaArrowRight, FaCheckCircle, FaMapMarkerAlt, FaUserTie
} from 'react-icons/fa';
// Importe ta fonction de service (à adapter selon ton chemin)
import { getAdminProducts } from '@/services/admin.service'; 

export default function StockDetailPage({ params }: { params: Promise<{ stockId: string }> }) {
    const { stockId } = use(params);
    const router = useRouter();
    
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isApproved, setIsApproved] = useState(false);

    useEffect(() => {
        async function fetchDetail() {
            const res = await getAdminProducts(); // Dans un vrai cas, tu ferais getProductById(stockId)
            if (res.success) {
                const found = res.data.find((p: any) => p.id === stockId);
                setProduct(found);
            }
            setLoading(false);
        }
        fetchDetail();
    }, [stockId]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <FaLeaf className="text-4xl text-emerald-500" />
            </motion.div>
        </div>
    );

    if (!product) return <div className="p-20 text-center">Produit introuvable.</div>;

    return (
        <div className="min-h-screen bg-[#FDFCFB] text-[#2D3436] mt-4">
            {/* 1. HEADER DYNAMIQUE */}
<div className="bg-white/80 backdrop-blur-md border-b border-orange-100/50 sticky top-[64px] z-30 px-6 py-5">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <button onClick={() => router.back()} className="p-3 bg-white shadow-sm rounded-2xl hover:bg-orange-50 transition-colors group border border-orange-50">
                        <FaChevronLeft className="text-orange-600 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    
                    <div className="flex gap-4">
                        <button className="px-6 py-3 font-bold text-gray-400 hover:text-red-500 transition-colors">
                            Archiver
                        </button>
                        <button 
                            onClick={() => setIsApproved(!isApproved)}
                            className={`px-8 py-3 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-2 ${
                                isApproved 
                                ? "bg-emerald-100 text-emerald-700 shadow-emerald-100" 
                                : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-200 hover:scale-105"
                            }`}
                        >
                            {isApproved ? <FaCheckCircle /> : <FaLeaf />}
                            {isApproved ? "Produit Validé" : "Valider la récolte"}
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto p-6 md:p-12">
                
                {/* 2. CARD PRINCIPALE DYNAMIQUE */}
                <div className="bg-white rounded-[3rem] shadow-xl shadow-orange-100/20 overflow-hidden border border-orange-50 mb-10">
                    <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/2 h-full relative bg-[#F9F7F2] flex items-center justify-center border-r border-orange-50">
                            <div className="text-center p-20">
                                <FaBox className="text-9xl text-orange-100 mb-4 mx-auto" />
                                <p className="text-sm font-bold text-orange-300 uppercase tracking-widest">{product.categoryLabel}</p>
                            </div>
                            <span className="absolute top-8 left-8 bg-white px-4 py-2 rounded-xl text-xs font-black text-emerald-600 shadow-sm border border-emerald-50">
                                {product.quantityForSale > 0 ? 'EN STOCK' : 'RUPTURE'}
                            </span>
                        </div>

                        <div className="md:w-1/2 p-12 flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.3em] mb-4">Code: {product.shortCode || 'N/A'}</span>
                            <h1 className="text-5xl font-black text-gray-900 mb-6 leading-tight">
                                {product.name} <br/>
                                <span className="text-emerald-500 text-3xl font-bold">Qualité Certifiée</span>
                            </h1>
                            <div className="flex items-center gap-3 text-gray-500 bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                                <FaMapMarkerAlt className="text-orange-400" />
                                <p className="text-sm font-medium">Origine : <span className="font-bold text-gray-800">{product.location}</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. INDICATEURS RÉELS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <MetricCard 
                        label="Stock Disponible" 
                        value={product.quantityForSale.toLocaleString()} 
                        unit={product.unit} 
                        icon={<FaChartLine className="text-emerald-500" />}
                        color="bg-emerald-50"
                    />
                    <MetricCard 
                        label="Prix Unitaire" 
                        value={product.price.toLocaleString()} 
                        unit="fcfa" 
                        icon={<FaEuroSign className="text-orange-500" />}
                        color="bg-orange-50"
                        subValue="Prix du marché respecté"
                    />
                    <MetricCard 
                        label="Commandes" 
                        value={product.totalOrders || 0} 
                        unit="reçues" 
                        icon={<FaCalendarCheck className="text-blue-500" />}
                        color="bg-blue-50"
                    />
                </div>

                {/* 4. PRODUCTEUR & NOTES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-orange-50 shadow-sm">
                        <h3 className="text-lg font-black mb-8 flex items-center gap-3">
                            <div className="w-2 h-6 bg-emerald-400 rounded-full" /> 
                            Producteur Référent
                        </h3>
                        <div className="flex items-center gap-5 p-6 bg-gray-50 rounded-[2rem] group hover:bg-emerald-50 transition-all cursor-pointer border border-transparent hover:border-emerald-100">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100">
                                <FaUserTie className="text-gray-400" />
                            </div>
                            <div>
                                <p className="font-black text-gray-900 text-lg">{product.producerName}</p>
                                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">{product.location}</p>
                            </div>
                            <FaArrowRight className="ml-auto text-gray-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                    </div>

                    <div className="bg-[#1B262C] p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 opacity-10 text-[12rem] rotate-12">🌿</div>
                        <h3 className="text-lg font-black mb-8">Détails Logistiques</h3>
                        <ul className="space-y-5 text-sm font-medium text-gray-400">
                            <li className="flex items-center gap-4 text-white">
                                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"><FaCheckCircle className="text-emerald-400" /></div>
                                Mise à jour : {new Date(product.updatedAt).toLocaleDateString('fr-FR')}
                            </li>
                            <li className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"><FaCheckCircle className="text-emerald-400" /></div>
                                Inventaire vérifié par l'Admin
                            </li>
                            <li className="flex items-center gap-4 opacity-50">
                                <div className="w-8 h-8 rounded-xl border border-gray-600 flex items-center justify-center">?</div>
                                Délai de péremption non renseigné
                            </li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}

function MetricCard({ label, value, unit, icon, color, subValue }: any) {
    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-orange-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mb-6 text-xl`}>
                {icon}
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-gray-900 tracking-tighter">{value}</span>
                <span className="text-sm font-black text-orange-400 uppercase">{unit}</span>
            </div>
            {subValue && <p className="mt-3 text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 inline-block px-2 py-1 rounded-md">{subValue}</p>}
        </div>
    );
}