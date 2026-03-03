'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    FaChevronLeft, FaLeaf, FaCalendarCheck, FaEuroSign, 
    FaBox, FaChartLine, FaArrowRight, FaCheckCircle
} from 'react-icons/fa';

export default function StockDetailPage({ params }: { params: Promise<{ stockId: string }> }) {
    const { stockId } = use(params);
    const router = useRouter();
    const [isApprovied, setIsApproved] = useState(false);

    return (
        <div className="min-h-screen bg-[#FDFCFB] text-[#2D3436]">
            {/* 1. HEADER RELAX & CHIC */}
            <div className="bg-white/60 backdrop-blur-xl border-b border-orange-100/50 sticky top-0 z-50 px-6 py-5">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <button onClick={() => router.back()} className="p-3 bg-white shadow-sm rounded-2xl hover:bg-orange-50 transition-colors group">
                        <FaChevronLeft className="text-orange-600 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="flex gap-4">
                        <button className="px-6 py-3 font-bold text-gray-400 hover:text-red-500 transition-colors">
                            Archiver
                        </button>
                        <button 
                            onClick={() => setIsApproved(true)}
                            className="px-8 py-3 bg-linear-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {isApprovied ? <FaCheckCircle className="animate-bounce" /> : <FaLeaf />}
                            {isApprovied ? "Produit Validé" : "Valider la récolte"}
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto p-6 md:p-12">
                
                {/* 2. CARD PRINCIPALE : L'ÂME DU PRODUIT */}
                <div className="bg-white rounded-[3rem] shadow-xl shadow-orange-100/20 overflow-hidden border border-orange-50 mb-10">
                    <div className="flex flex-col md:flex-row">
                        {/* Image Preview */}
                        <div className="md:w-1/2 h-100 relative bg-[#F9F7F2] flex items-center justify-center border-r border-orange-50">
                            <div className="text-center p-12">
                                <FaBox className="text-8xl text-orange-100 mb-4 mx-auto" />
                                <p className="text-sm font-medium text-orange-300 uppercase tracking-widest">Aperçu Récolte</p>
                            </div>
                            <span className="absolute top-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-xs font-black text-emerald-600 shadow-sm border border-emerald-50">
                                QUALITÉ PREMIUM
                            </span>
                        </div>

                        {/* Titre et Story */}
                        <div className="md:w-1/2 p-10 flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.3em] mb-2">Réf: {stockId}</span>
                            <h1 className="text-5xl font-black text-gray-900 mb-6 leading-tight">
                                Tomates Cerises <br/><span className="text-emerald-500">Gorgées de Soleil</span>
                            </h1>
                            <p className="text-gray-500 leading-relaxed italic border-l-4 border-orange-100 pl-6">
                                "Une variété douce et croquante, cultivée avec amour dans les terres de Thiès. Zéro traitement chimique."
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. LES INDICATEURS "PIED" (Doux & Lisibles) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <MetricCard 
                        label="Quantité Prête" 
                        value="1,240" 
                        unit="kg" 
                        icon={<FaChartLine className="text-emerald-500" />}
                        color="bg-emerald-50"
                    />
                    <MetricCard 
                        label="Prix de Vente" 
                        value="450" 
                        unit="fcfa" 
                        icon={<FaEuroSign className="text-orange-500" />}
                        color="bg-orange-50"
                        subValue="Le prix est juste"
                    />
                    <MetricCard 
                        label="Délai Livraison" 
                        value="24" 
                        unit="h" 
                        icon={<FaCalendarCheck className="text-blue-500" />}
                        color="bg-blue-50"
                    />
                </div>

                {/* 4. HISTORIQUE & PRODUCTEUR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-orange-50 shadow-sm">
                        <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                            <div className="w-2 h-6 bg-emerald-400 rounded-full" /> 
                            Origine du Produit
                        </h3>
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-3xl group hover:bg-emerald-50 transition-colors cursor-pointer">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">👨‍🌾</div>
                            <div>
                                <p className="font-black text-gray-900">Coopérative Bio Alpha</p>
                                <p className="text-xs text-emerald-600 font-bold">Producteur Certifié</p>
                            </div>
                            <FaArrowRight className="ml-auto text-gray-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                    </div>

                    <div className="bg-[#1B262C] p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl">🌿</div>
                        <h3 className="text-lg font-black mb-6">Notes de Contrôle</h3>
                        <ul className="space-y-4 text-sm font-medium text-gray-300">
                            <li className="flex items-center gap-3"><FaCheckCircle className="text-emerald-400" /> Photos vérifiées et nettes</li>
                            <li className="flex items-center gap-3"><FaCheckCircle className="text-emerald-400" /> Stock confirmé par inventaire</li>
                            <li className="flex items-center gap-3 opacity-40"><div className="w-4 h-4 rounded-full border border-gray-500" /> Certificat Phyto (Optionnel)</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}

function MetricCard({ label, value, unit, icon, color, subValue }: any) {
    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-orange-50 shadow-sm hover:shadow-md transition-all">
            <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-6`}>
                {icon}
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-gray-900">{value}</span>
                <span className="text-sm font-bold text-gray-400 uppercase">{unit}</span>
            </div>
            {subValue && <p className="mt-2 text-[10px] font-black text-emerald-600 uppercase italic tracking-tighter">{subValue}</p>}
        </div>
    );
}