"use client";

import React, { useState, use } from 'react';
import { FaShoppingCart, FaDollarSign, FaHistory, FaUserCircle, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

// Helper pour le formatage monétaire
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF', // Franc CFA
        maximumFractionDigits: 0
    }).format(amount);
};

interface PageProps {
    params: Promise<{ clientId: string }>;
}

// Header Section
function ClientHeader({ clientId }: { clientId: string }) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-6">
                <Link href="/clients" className="p-4 bg-white rounded-2xl shadow-sm hover:text-green-600 transition-all">
                    <FaArrowLeft />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic tracking-tight">
                        FICHE CLIENT <span className="text-green-600">#{clientId.slice(0, 5)}</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Profil Acheteur Certifié</p>
                </div>
            </div>
            <div className="flex items-center gap-4 bg-white p-3 rounded-3xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                    <FaUserCircle size={24} />
                </div>
                <div className="pr-4">
                    <p className="text-xs font-black text-slate-900">Grossiste Centre-Ouest</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Koudougou, BF</p>
                </div>
            </div>
        </div>
    );
}

// History Section
function ClientHistory() {
    return (
        <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
                <FaHistory className="text-slate-300" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Dernières Acquisitions</h2>
            </div>
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-transparent hover:border-green-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-400 text-xs">#{i}</div>
                            <div>
                                <p className="text-sm font-black text-slate-900 italic">Céréales Mixtes</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">12 Oct. 2025</p>
                            </div>
                        </div>
                        <p className="font-black text-slate-900">{formatCurrency(150000)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Action Center Section
interface ActionCenterProps {
    orderStep: 'idle' | 'selecting' | 'confirm';
    setOrderStep: React.Dispatch<React.SetStateAction<'idle' | 'selecting' | 'confirm'>>;
    selectedProduct: string;
    setSelectedProduct: React.Dispatch<React.SetStateAction<string>>;
    qty: number;
    setQty: React.Dispatch<React.SetStateAction<number>>;
    catalog: { id: string; name: string; stock: number; price: number; unit: string }[];
    totalPrice: number;
    handleConfirmOrder: () => void;
}

function ActionCenter({
    orderStep,
    setOrderStep,
    selectedProduct,
    setSelectedProduct,
    qty,
    setQty,
    catalog,
    totalPrice,
    handleConfirmOrder
}: ActionCenterProps) {
    return (
        <div className="space-y-10">
            <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-white overflow-hidden relative">
                <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mb-8 italic">
                    Transaction Directe.
                </h3>

                {orderStep === 'idle' ? (
                    <button 
                        onClick={() => setOrderStep('selecting')}
                        className="w-full bg-green-500 text-white py-8 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                    >
                        <FaShoppingCart /> Nouvelle Vente
                    </button>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">1. Choisir le produit</p>
                            <select 
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black italic text-slate-900 focus:ring-2 focus:ring-green-500 outline-none"
                                value={selectedProduct}
                                onChange={(e) => setSelectedProduct(e.target.value)}
                            >
                                <option value="">Sélectionner...</option>
                                {catalog.map(p => (
                                    <option key={p.id} value={p.name}>{p.name} ({p.stock}{p.unit} dispos)</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">2. Quantité (kg)</p>
                            <div className="flex gap-2">
                                {[50, 100, 500].map(val => (
                                    <button 
                                        key={val}
                                        onClick={() => setQty(qty + val)}
                                        className="flex-1 py-3 rounded-xl font-black text-[10px] bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                                    >
                                        +{val}
                                    </button>
                                ))}
                            </div>
                            <input 
                                type="number" 
                                placeholder="Quantité précise"
                                value={qty || ''}
                                onChange={(e) => setQty(Number(e.target.value))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black italic text-slate-900"
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <div className="flex justify-between mb-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Total Estimé</p>
                                <p className="text-2xl font-black text-slate-900 italic">
                                    {formatCurrency(totalPrice)}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setOrderStep('idle')}
                                    className="flex-1 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={handleConfirmOrder}
                                    disabled={!selectedProduct || qty <= 0}
                                    className="flex-2 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-20 disabled:cursor-not-allowed"
                                >
                                    Confirmer la sortie
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-amber-50 p-8 rounded-[3rem] border border-amber-100">
                <div className="flex items-center gap-3 text-amber-600 mb-2">
                    <FaDollarSign size={14} />
                    <p className="text-[9px] font-black uppercase tracking-widest">Encours Client</p>
                </div>
                <p className="text-xl font-black text-slate-900 italic">
                    0 F <span className="text-[10px] text-slate-400 not-italic uppercase ml-2 font-bold">Aucun impayé</span>
                </p>
            </div>
        </div>
    );
}

export default function ClientDetailPage({ params }: PageProps) {
    const { clientId } = use(params);

    const [orderStep, setOrderStep] = useState<'idle' | 'selecting' | 'confirm'>('idle');
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [qty, setQty] = useState<number>(0);

    const catalog = [
        { id: 'm1', name: 'Maïs Jaune', stock: 12500, price: 190, unit: 'kg' },
        { id: 't1', name: 'Tomate Roma', stock: 850, price: 350, unit: 'kg' },
    ];

    const currentProductData = catalog.find(p => p.name === selectedProduct);
    const totalPrice = qty * (currentProductData?.price || 0);

    const handleConfirmOrder = () => {
        console.log(`Commande confirmée pour ${clientId}: ${qty}kg de ${selectedProduct}`);
        alert("Vente enregistrée avec succès !");
        setOrderStep('idle');
        setQty(0);
        setSelectedProduct('');
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-12 pb-32">
            <ClientHeader clientId={clientId} />
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-7 space-y-8">
                    <ClientHistory />
                </div>
                <div className="xl:col-span-5">
                    <ActionCenter
                        orderStep={orderStep}
                        setOrderStep={setOrderStep}
                        selectedProduct={selectedProduct}
                        setSelectedProduct={setSelectedProduct}
                        qty={qty}
                        setQty={setQty}
                        catalog={catalog}
                        totalPrice={totalPrice}
                        handleConfirmOrder={handleConfirmOrder}
                    />
                </div>
            </div>
        </div>
    );
}