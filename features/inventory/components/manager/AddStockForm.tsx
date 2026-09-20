'use client';

import { FaLeaf, FaBox, FaTractor } from 'react-icons/fa';
import type { FormEventHandler } from 'react';
import type { FieldValues, UseFormRegister } from 'react-hook-form';

interface Props {
  register: UseFormRegister<FieldValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
}

export default function AddStockForm({ register, onSubmit, onClose }: Props) {
  return (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-green-100 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black uppercase italic text-slate-900">Entrée de Stock Initial</h3>
                    <button onClick={() => onClose()} className="text-slate-400 hover:text-red-500">Fermer</button>
                </div>
                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nom du produit</label>
                        <input {...register('itemName', { required: true })} className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-green-500" placeholder="ex: Engrais NPK" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Quantité</label>
                            <input type="number" step="0.01" {...register('quantity', { required: true })} className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-green-500" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Unité</label>
                            <select {...register('unit', { required: true })} className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-green-500">
                                <option value="kg">Kg</option>
                                <option value="tonnes">Tonnes</option>
                                <option value="sacs">Sacs</option>
                                <option value="litres">Litres</option>
                                <option value="unites">Unités</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Type de Stock</label>
                        <div className="flex gap-4">
                            <label className="flex-1 cursor-pointer">
                                <input type="radio" value="HARVEST" {...register('type')} defaultChecked className="peer sr-only" />
                                <div className="p-4 rounded-xl bg-slate-50 border-2 border-transparent peer-checked:border-green-500 peer-checked:bg-green-50 text-center transition-all">
                                    <FaLeaf className="mx-auto mb-2 text-green-600" />
                                    <span className="text-xs font-bold uppercase">Récolte</span>
                                </div>
                            </label>
                            <label className="flex-1 cursor-pointer">
                                <input type="radio" value="INPUT" {...register('type')} className="peer sr-only" />
                                <div className="p-4 rounded-xl bg-slate-50 border-2 border-transparent peer-checked:border-blue-500 peer-checked:bg-blue-50 text-center transition-all">
                                    <FaBox className="mx-auto mb-2 text-blue-600" />
                                    <span className="text-xs font-bold uppercase">Intrant</span>
                                </div>
                            </label>
                            <label className="flex-1 cursor-pointer">
                                <input type="radio" value="EQUIPMENT" {...register('type')} className="peer sr-only" />
                                <div className="p-4 rounded-xl bg-slate-50 border-2 border-transparent peer-checked:border-orange-500 peer-checked:bg-orange-50 text-center transition-all">
                                    <FaTractor className="mx-auto mb-2 text-orange-600" />
                                    <span className="text-xs font-bold uppercase">Matériel</span>
                                </div>
                            </label>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black uppercase rounded-xl hover:bg-slate-800 transition-all">
                            Enregistrer le stock
                        </button>
                    </div>
                </form>
            </div>
  );
}
