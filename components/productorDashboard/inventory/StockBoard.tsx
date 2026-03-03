'use client';

import React, { useState } from 'react';
import { FaLeaf, FaBox, FaTractor, FaPlus, FaHistory, FaExchangeAlt, FaArrowUp, FaArrowDown, FaTrash, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { createStock, addStockMovement, deleteStock } from '@/services/inventory.service';

interface Stock {
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    type: 'INPUT' | 'HARVEST' | 'EQUIPMENT';
    updatedAt: Date;
    movements?: any[];
}

interface StockBoardProps {
    farmId: string;
    stocks: Stock[];
    onRefresh: () => void;
}

export default function StockBoard({ farmId, stocks, onRefresh }: StockBoardProps) {
    const [activeTab, setActiveTab] = useState<'HARVEST' | 'INPUT' | 'EQUIPMENT'>('HARVEST');
    const [isAdding, setIsAdding] = useState(false);
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null); // For movement modal

    const filteredStocks = stocks.filter(s => s.type === activeTab);

    const handleDelete = async (id: string) => {
        if (confirm("Êtes-vous sûr de vouloir supprimer ce stock ? Cette action est irréversible.")) {
            const res = await deleteStock(id);
            if (res.success) {
                toast.success("Stock supprimé");
                onRefresh();
            } else {
                toast.error("Erreur lors de la suppression");
            }
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* TABS & ACTIONS */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div className="flex bg-white p-1 rounded-[1.5rem] shadow-sm border border-slate-100">
                    <TabButton active={activeTab === 'HARVEST'} onClick={() => setActiveTab('HARVEST')} icon={FaLeaf} label="Récoltes" color="green" />
                    <TabButton active={activeTab === 'INPUT'} onClick={() => setActiveTab('INPUT')} icon={FaBox} label="Intrants" color="blue" />
                    <TabButton active={activeTab === 'EQUIPMENT'} onClick={() => setActiveTab('EQUIPMENT')} icon={FaTractor} label="Matériel" color="orange" />
                </div>

                <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                    <FaPlus /> Ajouter Stock
                </button>
            </div>

            {/* STOCK GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20 custom-scrollbar">
                {filteredStocks.map(stock => (
                    <div key={stock.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">
                                {new Date(stock.updatedAt).toLocaleDateString()}
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setSelectedStock(stock)}
                                    className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
                                    title="Mettre à jour le stock"
                                >
                                    <FaExchangeAlt size={10} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(stock.id)}
                                    className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                    title="Supprimer le stock"
                                >
                                    <FaTrash size={10} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative z-10">
                            <h3 className="text-lg font-black text-slate-900 italic leading-tight mb-1">{stock.itemName}</h3>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">
                                {stock.quantity} <span className="text-sm text-slate-400 font-bold not-italic">{stock.unit}</span>
                            </p>
                        </div>

                        {/* Recent Movements Mini-Log */}
                        {stock.movements && stock.movements.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-slate-50 relative z-10">
                                <p className="text-[9px] font-black uppercase text-slate-300 mb-2">Derniers Mouvements</p>
                                <div className="space-y-2">
                                    {stock.movements.slice(0, 2).map((mov: any) => (
                                        <div key={mov.id} className="flex justify-between items-center text-[10px]">
                                            <span className={`font-bold ${mov.type === 'IN' ? 'text-green-500' : 'text-red-500'}`}>
                                                {mov.type === 'IN' ? '+' : '-'}{mov.quantity}
                                            </span>
                                            <span className="text-slate-400 truncate max-w-[100px]">{mov.reason || 'N/A'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Decorative BG */}
                        <div className={`absolute -right-6 -bottom-6 text-9xl opacity-5 transform rotate-12 transition-transform group-hover:rotate-0 ${
                            activeTab === 'HARVEST' ? 'text-green-500' : activeTab === 'INPUT' ? 'text-blue-500' : 'text-orange-500'
                        }`}>
                            {activeTab === 'HARVEST' ? <FaLeaf /> : activeTab === 'INPUT' ? <FaBox /> : <FaTractor />}
                        </div>
                    </div>
                ))}

                {filteredStocks.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-300">
                        <div className="text-6xl mb-4 opacity-20">
                            {activeTab === 'HARVEST' ? <FaLeaf /> : activeTab === 'INPUT' ? <FaBox /> : <FaTractor />}
                        </div>
                        <p className="text-sm font-bold uppercase">Aucun stock dans cette catégorie</p>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {isAdding && (
                <Modal title="Nouveau Stock" onClose={() => setIsAdding(false)}>
                    <StockForm farmId={farmId} type={activeTab} onSuccess={() => { setIsAdding(false); onRefresh(); }} />
                </Modal>
            )}

            {selectedStock && (
                <Modal title={`Mise à jour : ${selectedStock.itemName}`} onClose={() => setSelectedStock(null)}>
                    <MovementForm stock={selectedStock} onSuccess={() => { setSelectedStock(null); onRefresh(); }} />
                </Modal>
            )}
        </div>
    );
}

// --- SUB COMPONENTS ---

function TabButton({ active, onClick, icon: Icon, label, color }: any) {
    const activeClass = active 
        ? `bg-${color}-50 text-${color}-600 shadow-sm` 
        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50';
    
    // Tailwind dynamic classes workaround (safelist these or use style)
    // For simplicity, let's use specific classes based on color prop logic
    let colorClass = '';
    if (active) {
        if (color === 'green') colorClass = 'bg-green-50 text-green-600';
        if (color === 'blue') colorClass = 'bg-blue-50 text-blue-600';
        if (color === 'orange') colorClass = 'bg-orange-50 text-orange-600';
    } else {
        colorClass = 'text-slate-400 hover:text-slate-600 hover:bg-slate-50';
    }

    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.2rem] transition-all duration-300 ${colorClass}`}
        >
            <Icon size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
        </button>
    );
}

function Modal({ title, children, onClose }: any) {
    return (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black uppercase italic text-slate-900">{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <FaTrash size={10} className="rotate-45" /> {/* Using trash icon as close X for style */}
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function StockForm({ farmId, type, onSuccess }: any) {
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

function MovementForm({ stock, onSuccess }: { stock: Stock, onSuccess: () => void }) {
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
