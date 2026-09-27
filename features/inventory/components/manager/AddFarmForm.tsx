'use client';

import type { FormEventHandler } from 'react';
import type { FieldValues, UseFormRegister } from 'react-hook-form';

interface Props {
  register: UseFormRegister<FieldValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function AddFarmForm({ register, onSubmit }: Props) {
  return (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in slide-in-from-top-2">
                <h3 className="text-sm font-black uppercase text-slate-500 mb-4">Ajouter une ferme</h3>
                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input {...register('name', { required: true })} placeholder="Nom (ex: Ferme Loumbila)" className="p-3 rounded-xl border border-slate-200" />
                    <input {...register('location')} placeholder="Localisation (ex: Loumbila, Secteur 4)" className="p-3 rounded-xl border border-slate-200" />
                    
                    <div className="relative">
                        <input type="number" step="0.1" {...register('size')} placeholder="Superficie" className="w-full p-3 rounded-xl border border-slate-200" />
                        <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">Ha</span>
                    </div>

                    <select {...register('soilType')} className="p-3 rounded-xl border border-slate-200 text-slate-600">
                        <option value="">Type de Sol (Optionnel)</option>
                        <option value="Sablo-argileux">Sablo-argileux</option>
                        <option value="Argileux">Argileux</option>
                        <option value="Limoneux">Limoneux</option>
                        <option value="Gravillonnaire">Gravillonnaire</option>
                    </select>

                    <select {...register('waterSource')} className="p-3 rounded-xl border border-slate-200 text-slate-600">
                        <option value="">Source d'eau (Optionnel)</option>
                        <option value="Pluviale">Pluviale (Hivernage)</option>
                        <option value="Forage">Forage</option>
                        <option value="Puits">Puits Traditionnel</option>
                        <option value="Barrage">Barrage / Retenue</option>
                    </select>

                    <button type="submit" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">
                        Créer la ferme
                    </button>
                </form>
            </div>
  );
}
