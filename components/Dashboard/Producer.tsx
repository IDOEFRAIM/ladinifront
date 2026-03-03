'use client';

import React from 'react';
import { FaShoppingBasket, FaWallet, FaBrain, FaArrowRight } from 'react-icons/fa';

// Données simulées
const mockProducerData = {
    newOrders: 5,
    totalStockValue: '1.2M XOF',
    iaDiagnosis: 'Risque modéré de mildiou sur le maïs.',
};

export default function ProducerDashboard() {
    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Header Section */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-emerald-600 flex items-center gap-2">
                    🌿 Espace Producteur
                </h1>
                <p className="text-slate-500 mt-2 text-lg">
                    Gérez vos ventes, vos stocks et recevez les analyses de l'IA.
                </p>
            </header>

            {/* Grid des Cartes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Carte 1 : Commandes */}
                <DashboardCard 
                    title="Nouvelles Commandes" 
                    value={mockProducerData.newOrders} 
                    icon={<FaShoppingBasket className="text-emerald-500" />}
                    linkText="Gérer les expéditions"
                    linkHref="/sales"
                />

                {/* Carte 2 : Stock */}
                <DashboardCard 
                    title="Valeur du Stock" 
                    value={mockProducerData.totalStockValue} 
                    icon={<FaWallet className="text-emerald-500" />}
                    linkText="Modifier le catalogue"
                    linkHref="/products/manage"
                />

                {/* Carte 3 : IA (Alerte Visuelle) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-amber-500 hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-slate-600 font-semibold uppercase text-xs tracking-wider">🧠 Diagnostic IA</h3>
                        <FaBrain className="text-amber-500 text-xl" />
                    </div>
                    <p className="text-lg text-slate-800 font-medium leading-relaxed mb-6">
                        {mockProducerData.iaDiagnosis}
                    </p>
                    <a href="/ia-analysis" className="text-amber-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Voir le rapport complet <FaArrowRight size={12} />
                    </a>
                </div>

            </div>
        </div>
    );
}

// Sous-composant pour éviter la répétition (DRY)
interface CardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    linkText: string;
    linkHref: string;
}

function DashboardCard({ title, value, icon, linkText, linkHref }: CardProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-emerald-500 hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-slate-600 font-semibold uppercase text-xs tracking-wider">{title}</h3>
                <span className="text-xl opacity-80">{icon}</span>
            </div>
            <p className="text-3xl font-black text-slate-900 mb-6">{value}</p>
            <a 
                href={linkHref} 
                className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:underline"
            >
                {linkText} <FaArrowRight size={10} />
            </a>
        </div>
    );
}