'use client';

import { FaArrowUp, FaArrowDown, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { createStock, addStockMovement } from '@/features/inventory/actions/inventory.actions';
import { Stock } from '@/features/inventory/components/stock/stock.types';

export function StockForm({ farmId, type, onSuccess }: any) {
    const { register, handleSubmit, formState: { isSubmitting } } = useForm();

    const onSubmit = async (data: any) => {
        const res = await createStock(farmId, {
            ...data,
            quantity: parseFloat(data.quantity),
            type: type
        });
        if (res.success) {
            toast.success("Stock ajouté !");
            onSuccess();
        } else {
            toast.error("Erreur lors de l'ajout");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nom du produit</label>
                <input {...register('itemName', { required: true })} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none" placeholder="ex: Engrais NPK" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Quantité</label>
                    <input type="number" step="0.01" {...register('quantity', { required: true })} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none" placeholder="0.00" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Unité</label>
                    <select {...register('unit', { required: true })} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none text-xs">
                        <option value="kg">Kg</option>
                        <option value="tonnes">Tonnes</option>
                        <option value="sacs">Sacs</option>
                        <option value="litres">Litres</option>
                        <option value="unites">Unités</option>
                    </select>
                </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-2 rounded-2xl font-black uppercase text-xs bg-slate-900 text-white hover:bg-slate-800">
                {isSubmitting ? 'Enregistrement...' : 'Ajouter au stock'}
            </button>
        </form>
    );
}

export function MovementForm({ stock, onSuccess }: { stock: Stock, onSuccess: () => void }) {
    const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm();
    const type = watch('type', 'IN');

    const onSubmit = async (data: any) => {
        const res = await addStockMovement(stock.id, {
            ...data,
            quantity: parseFloat(data.quantity)
        });
        if (res.success) {
            toast.success("Mouvement enregistré !");
            onSuccess();
        } else {
            toast.error(res.error || "Erreur");
        }
    };

    // Helper text based on selection
    const getHelperText = () => {
        switch(type) {
            case 'IN': return "Ajoutez du stock suite à un achat, une récolte ou un don.";
            case 'OUT': return "Retirez du stock pour une vente, une utilisation ou un don.";
            case 'WASTE': return "Stock perdu à cause d'avarie, vol, ou destruction.";
            default: return "";
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Current Status */}
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Stock Actuel</span>
                <span className="text-xl font-black text-slate-900">{stock.quantity} {stock.unit}</span>
            </div>

            {/* Type Selection */}
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Type de mouvement</label>
                <div className="grid grid-cols-3 gap-2">
                    <label className={`cursor-pointer relative overflow-hidden rounded-2xl border-2 transition-all ${type === 'IN' ? 'border-green-500 bg-green-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                        <input type="radio" value="IN" {...register('type')} className="sr-only" />
                        <div className="p-3 flex flex-col items-center gap-1 text-center">
                            <FaArrowUp className={type === 'IN' ? 'text-green-600' : 'text-slate-400'} />
                            <span className={`text-[10px] font-black uppercase ${type === 'IN' ? 'text-green-700' : 'text-slate-500'}`}>Entrée</span>
                        </div>
                    </label>

                    <label className={`cursor-pointer relative overflow-hidden rounded-2xl border-2 transition-all ${type === 'OUT' ? 'border-orange-500 bg-orange-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                        <input type="radio" value="OUT" {...register('type')} className="sr-only" />
                        <div className="p-3 flex flex-col items-center gap-1 text-center">
                            <FaArrowDown className={type === 'OUT' ? 'text-orange-600' : 'text-slate-400'} />
                            <span className={`text-[10px] font-black uppercase ${type === 'OUT' ? 'text-orange-700' : 'text-slate-500'}`}>Sortie</span>
                        </div>
                    </label>

                    <label className={`cursor-pointer relative overflow-hidden rounded-2xl border-2 transition-all ${type === 'WASTE' ? 'border-red-500 bg-red-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                        <input type="radio" value="WASTE" {...register('type')} className="sr-only" />
                        <div className="p-3 flex flex-col items-center gap-1 text-center">
                            <FaExclamationTriangle className={type === 'WASTE' ? 'text-red-600' : 'text-slate-400'} />
                            <span className={`text-[10px] font-black uppercase ${type === 'WASTE' ? 'text-red-700' : 'text-slate-500'}`}>Perte</span>
                        </div>
                    </label>
                </div>
                
                {/* Dynamic Helper Text */}
                <div className="flex items-start gap-2 px-2 py-2 bg-blue-50 rounded-xl text-blue-700 text-xs">
                    <FaInfoCircle className="mt-0.5 shrink-0" />
                    <p>{getHelperText()}</p>
                </div>
            </div>

            {/* Quantity Input */}
            <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Quantité à {type === 'IN' ? 'ajouter' : 'retirer'}</label>
                <div className="relative">
                    <input 
                        type="number" 
                        step="0.01" 
                        {...register('quantity', { required: true, min: 0.01 })} 
                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 transition-all" 
                        placeholder="0.00" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{stock.unit}</span>
                </div>
            </div>

            {/* Reason Input */}
            <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Motif (Optionnel)</label>
                <input 
                    {...register('reason')} 
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 transition-all" 
                    placeholder={type === 'IN' ? "ex: Achat au marché central" : type === 'OUT' ? "ex: Vente à un client" : "ex: Sacs déchirés"} 
                />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-2 rounded-2xl font-black uppercase text-xs bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95">
                {isSubmitting ? 'Mise à jour...' : 'Confirmer le mouvement'}
            </button>
        </form>
    );
}
