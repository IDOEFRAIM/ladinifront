'use client';

import { FaExchangeAlt, FaLeaf, FaBox, FaTractor } from 'react-icons/fa';
import type { FormEventHandler } from 'react';
import type { FieldValues, UseFormRegister } from 'react-hook-form';
import type { Stock } from '@/features/inventory/components/manager/inventory-manager.types';

interface Props {
  stock: Stock;
  movementOpen: boolean;
  onOpenMovement: () => void;
  onCloseMovement: () => void;
  register: UseFormRegister<FieldValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export default function StockCard({ stock, movementOpen, onOpenMovement, onCloseMovement, register, onSubmit }: Props) {
  return (
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group relative overflow-hidden">
                
                {/* Background Icon */}
                <div className="absolute -right-4 -bottom-4 text-slate-50 group-hover:text-slate-100 transition-colors">
                    {stock.type === 'HARVEST' && <FaLeaf size={100} />}
                    {stock.type === 'INPUT' && <FaBox size={100} />}
                    {stock.type === 'EQUIPMENT' && <FaTractor size={100} />}
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            stock.type === 'HARVEST' ? 'bg-green-100 text-green-700' :
                            stock.type === 'INPUT' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                        }`}>
                            {stock.type === 'HARVEST' ? 'Récolte' : stock.type === 'INPUT' ? 'Intrant' : 'Matériel'}
                        </span>
                        <button onClick={() => onOpenMovement()} className="text-slate-300 hover:text-slate-900 transition-colors">
                            <FaExchangeAlt />
                        </button>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 italic mb-1">{stock.itemName}</h3>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">
                        {stock.quantity} <span className="text-sm text-slate-400 font-bold not-italic">{stock.unit}</span>
                    </p>

                    {/* MOVEMENT FORM OVERLAY */}
                    {movementOpen && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col justify-center p-6 animate-in fade-in">
                            <h4 className="text-center text-xs font-black uppercase mb-4">Mouvement de Stock</h4>
                            <form onSubmit={onSubmit} className="space-y-3">
                                <div className="flex gap-2">
                                    <select {...register('type')} className="flex-1 p-2 bg-slate-100 rounded-lg text-xs font-bold">
                                        <option value="IN">Entrée (+)</option>
                                        <option value="OUT">Sortie (-)</option>
                                        <option value="WASTE">Perte (-)</option>
                                    </select>
                                    <input type="number" step="0.01" {...register('quantity', { required: true })} placeholder="Qté" className="w-20 p-2 bg-slate-100 rounded-lg text-xs" />
                                </div>
                                <input {...register('reason')} placeholder="Raison (ex: Vente)" className="w-full p-2 bg-slate-100 rounded-lg text-xs" />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => onCloseMovement()} className="flex-1 py-2 bg-slate-200 rounded-lg text-xs font-bold">Annuler</button>
                                    <button type="submit" className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Valider</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
  );
}
