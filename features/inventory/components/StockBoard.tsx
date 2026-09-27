'use client';

import { useState } from 'react';
import { FaLeaf, FaBox, FaTractor, FaPlus, FaExchangeAlt, FaTrash } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { deleteStock } from '@/features/inventory/actions/inventory.actions';
import { Stock } from '@/features/inventory/components/stock/stock.types';
import { TabButton, Modal } from '@/features/inventory/components/stock/StockBoardUi';
import { StockForm, MovementForm } from '@/features/inventory/components/stock/StockForms';

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
