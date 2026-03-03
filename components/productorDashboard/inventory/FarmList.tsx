'use client';

import React, { useState } from 'react';
import { FaTractor, FaMapMarkerAlt, FaRulerCombined, FaTint, FaPlus } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { createFarm } from '@/services/inventory.service';

interface Farm {
    id: string;
    name: string;
    location: string | null;
    size: number | null;
    soilType: string | null;
    waterSource: string | null;
}

interface FarmListProps {
    farms: Farm[];
    selectedFarmId: string | null;
    onSelectFarm: (id: string) => void;
    onFarmCreated: () => void;
}

export default function FarmList({ farms, selectedFarmId, onSelectFarm, onFarmCreated }: FarmListProps) {
    const [isCreating, setIsCreating] = useState(false);
    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
    // userId est géré côté serveur via cookie httpOnly — pas besoin ici
    
    return (
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900 uppercase italic">Mes Fermes</h2>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg shadow-slate-200"
                >
                    <FaPlus size={12} />
                </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {farms.map(farm => (
                    <button
                        key={farm.id}
                        onClick={() => onSelectFarm(farm.id)}
                        className={`w-full text-left p-5 rounded-[2rem] transition-all duration-300 group relative overflow-hidden ${
                            selectedFarmId === farm.id 
                            ? 'bg-green-600 text-white shadow-xl shadow-green-200 scale-[1.02]' 
                            : 'bg-slate-50 text-slate-500 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100'
                        }`}
                    >
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <FaTractor className={`text-xl ${selectedFarmId === farm.id ? 'text-green-200' : 'text-slate-300'}`} />
                                {farm.size && (
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                                        selectedFarmId === farm.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                        {farm.size} Ha
                                    </span>
                                )}
                            </div>
                            <h3 className={`text-lg font-black uppercase italic mb-1 ${selectedFarmId === farm.id ? 'text-white' : 'text-slate-900'}`}>
                                {farm.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-80">
                                <FaMapMarkerAlt />
                                {farm.location || 'Non localisé'}
                            </div>
                        </div>
                        
                        {/* Decorative Background */}
                        <FaTractor className={`absolute -right-4 -bottom-4 text-8xl opacity-10 transform -rotate-12 transition-transform group-hover:rotate-0 ${
                            selectedFarmId === farm.id ? 'text-white' : 'text-slate-900'
                        }`} />
                    </button>
                ))}

                {farms.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <p className="text-xs font-bold uppercase">Aucune ferme</p>
                    </div>
                )}
            </div>

            {/* Modal Creation (Simplified) */}
            {isCreating && (
                <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in-95">
                        <h3 className="text-xl font-black uppercase italic text-slate-900 mb-6">Nouvelle Ferme</h3>
                        <FarmForm 
                            onCancel={() => setIsCreating(false)} 
                            onSuccess={() => { setIsCreating(false); onFarmCreated(); }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-component for the form to keep things clean
function FarmForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
    const { register, handleSubmit, formState: { isSubmitting } } = useForm();

    const onSubmit = async (data: any) => {
        // userId est récupéré côté serveur via cookie httpOnly — pas besoin de le passer
        const res = await createFarm({
            ...data,
            size: data.size ? parseFloat(data.size) : undefined
        });
        
        if (res.success) {
            toast.success("Ferme créée avec succès !");
            onSuccess();
        } else {
            toast.error(res.error || "Erreur lors de la création");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nom de la ferme</label>
                <input {...register('name', { required: true })} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-green-500 outline-none" placeholder="ex: Ferme Loumbila" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Localisation</label>
                    <input {...register('location')} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none" placeholder="Ville/Village" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Superficie (Ha)</label>
                    <input type="number" step="0.1" {...register('size')} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none" placeholder="0.0" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Type de Sol</label>
                    <select {...register('soilType')} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none text-xs">
                        <option value="">Sélectionner</option>
                        <option value="Sablo-argileux">Sablo-argileux</option>
                        <option value="Argileux">Argileux</option>
                        <option value="Limoneux">Limoneux</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Source d'eau</label>
                    <select {...register('waterSource')} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none text-xs">
                        <option value="">Sélectionner</option>
                        <option value="Pluviale">Pluviale</option>
                        <option value="Forage">Forage</option>
                        <option value="Puits">Puits</option>
                        <option value="Barrage">Barrage</option>
                    </select>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onCancel} className="flex-1 py-4 rounded-2xl font-black uppercase text-xs bg-slate-100 text-slate-500 hover:bg-slate-200">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 rounded-2xl font-black uppercase text-xs bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
                    {isSubmitting ? 'Création...' : 'Créer'}
                </button>
            </div>
        </form>
    );
}
