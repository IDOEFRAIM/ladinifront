'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { FaWarehouse, FaPlus, FaHistory, FaExchangeAlt, FaLeaf, FaBox, FaTractor } from 'react-icons/fa';
import { getFarms, getStocks, createStock, addStockMovement, createFarm } from '@/services/inventory.service';
import { useAuth } from '@/hooks/useAuth';

type StockType = 'INPUT' | 'HARVEST' | 'EQUIPMENT';

interface Farm {
    id: string;
    name: string;
    location: string | null;
}

interface Stock {
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    type: StockType;
    updatedAt: Date;
}

export default function InventoryManager() {
    const { user } = useAuth();
    const [farms, setFarms] = useState<Farm[]>([]);
    const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddStock, setShowAddStock] = useState(false);
    const [showMovement, setShowMovement] = useState<string | null>(null); // stockId

    // Forms
    const { register: registerStock, handleSubmit: handleStockSubmit, reset: resetStock } = useForm();
    const { register: registerMove, handleSubmit: handleMoveSubmit, reset: resetMove } = useForm();
    const { register: registerFarm, handleSubmit: handleFarmSubmit, reset: resetFarm } = useForm();
    const [showAddFarm, setShowAddFarm] = useState(false);

    useEffect(() => {
        if (user?.id) {
            loadFarms();
        }
    }, [user?.id]);

    useEffect(() => {
        if (selectedFarmId) {
            loadStocks(selectedFarmId);
        }
    }, [selectedFarmId]);

    const loadFarms = async () => {
        if (!user?.id) return;
        const res = await getFarms();
        if (res.success && res.data) {
            setFarms(res.data);
            if (res.data.length > 0 && !selectedFarmId) {
                setSelectedFarmId(res.data[0].id);
            }
        }
        setIsLoading(false);
    };

    const loadStocks = async (farmId: string) => {
        const res = await getStocks(farmId);
        if (res.success && res.data) {
            setStocks(res.data as any);
        }
    };

    const onAddFarm = async (data: any) => {
        if (!user?.id) return;
        const res = await createFarm({
            ...data,
            size: data.size ? parseFloat(data.size) : undefined
        });
        if (res.success) {
            toast.success("Ferme créée !");
            loadFarms();
            setShowAddFarm(false);
            resetFarm();
        } else {
            toast.error(res.error || "Erreur lors de la création");
        }
    };

    const onAddStock = async (data: any) => {
        if (!selectedFarmId) return;
        const res = await createStock(selectedFarmId, {
            ...data,
            quantity: parseFloat(data.quantity),
            type: data.type as StockType
        });
        if (res.success) {
            toast.success("Stock ajouté !");
            loadStocks(selectedFarmId);
            setShowAddStock(false);
            resetStock();
        } else {
            toast.error("Erreur lors de l'ajout");
        }
    };

    const onAddMovement = async (data: any) => {
        if (!showMovement) return;
        const res = await addStockMovement(showMovement, {
            ...data,
            quantity: parseFloat(data.quantity)
        });
        if (res.success) {
            toast.success("Mouvement enregistré !");
            if (selectedFarmId) loadStocks(selectedFarmId);
            setShowMovement(null);
            resetMove();
        } else {
            toast.error(res.error || "Erreur");
        }
    };

    if (isLoading) return <div className="p-10 text-center">Chargement de vos fermes...</div>;

    return (
        <div className="space-y-8">
            {/* HEADER & FARM SELECTOR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                        <FaWarehouse size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase italic">Mes Fermes</h2>
                        <div className="flex gap-2 mt-1">
                            {farms.map(farm => (
                                <button
                                    key={farm.id}
                                    onClick={() => setSelectedFarmId(farm.id)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                                        selectedFarmId === farm.id 
                                        ? 'bg-slate-900 text-white shadow-lg' 
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    {farm.name}
                                </button>
                            ))}
                            <button 
                                onClick={() => setShowAddFarm(!showAddFarm)}
                                className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 border-dashed"
                            >
                                + Nouvelle
                            </button>
                        </div>
                    </div>
                </div>
                
                {selectedFarmId && (
                    <button 
                        onClick={() => setShowAddStock(true)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-green-200"
                    >
                        <FaPlus size={12} />
                        <span className="text-xs font-black uppercase tracking-wider">Nouveau Stock</span>
                    </button>
                )}
            </div>

            {/* ADD FARM FORM */}
            {showAddFarm && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-in slide-in-from-top-2">
                    <h3 className="text-sm font-black uppercase text-slate-500 mb-4">Ajouter une ferme</h3>
                    <form onSubmit={handleFarmSubmit(onAddFarm)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input {...registerFarm('name', { required: true })} placeholder="Nom (ex: Ferme Loumbila)" className="p-3 rounded-xl border border-slate-200" />
                        <input {...registerFarm('location')} placeholder="Localisation (ex: Loumbila, Secteur 4)" className="p-3 rounded-xl border border-slate-200" />
                        
                        <div className="relative">
                            <input type="number" step="0.1" {...registerFarm('size')} placeholder="Superficie" className="w-full p-3 rounded-xl border border-slate-200" />
                            <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">Ha</span>
                        </div>

                        <select {...registerFarm('soilType')} className="p-3 rounded-xl border border-slate-200 text-slate-600">
                            <option value="">Type de Sol (Optionnel)</option>
                            <option value="Sablo-argileux">Sablo-argileux</option>
                            <option value="Argileux">Argileux</option>
                            <option value="Limoneux">Limoneux</option>
                            <option value="Gravillonnaire">Gravillonnaire</option>
                        </select>

                        <select {...registerFarm('waterSource')} className="p-3 rounded-xl border border-slate-200 text-slate-600">
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
            )}

            {/* ADD STOCK FORM */}
            {showAddStock && (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-green-100 animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black uppercase italic text-slate-900">Entrée de Stock Initial</h3>
                        <button onClick={() => setShowAddStock(false)} className="text-slate-400 hover:text-red-500">Fermer</button>
                    </div>
                    <form onSubmit={handleStockSubmit(onAddStock)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nom du produit</label>
                            <input {...registerStock('itemName', { required: true })} className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-green-500" placeholder="ex: Engrais NPK" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Quantité</label>
                                <input type="number" step="0.01" {...registerStock('quantity', { required: true })} className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-green-500" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Unité</label>
                                <select {...registerStock('unit', { required: true })} className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-green-500">
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
                                    <input type="radio" value="HARVEST" {...registerStock('type')} defaultChecked className="peer sr-only" />
                                    <div className="p-4 rounded-xl bg-slate-50 border-2 border-transparent peer-checked:border-green-500 peer-checked:bg-green-50 text-center transition-all">
                                        <FaLeaf className="mx-auto mb-2 text-green-600" />
                                        <span className="text-xs font-bold uppercase">Récolte</span>
                                    </div>
                                </label>
                                <label className="flex-1 cursor-pointer">
                                    <input type="radio" value="INPUT" {...registerStock('type')} className="peer sr-only" />
                                    <div className="p-4 rounded-xl bg-slate-50 border-2 border-transparent peer-checked:border-blue-500 peer-checked:bg-blue-50 text-center transition-all">
                                        <FaBox className="mx-auto mb-2 text-blue-600" />
                                        <span className="text-xs font-bold uppercase">Intrant</span>
                                    </div>
                                </label>
                                <label className="flex-1 cursor-pointer">
                                    <input type="radio" value="EQUIPMENT" {...registerStock('type')} className="peer sr-only" />
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
            )}

            {/* STOCK LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stocks.map(stock => (
                    <div key={stock.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group relative overflow-hidden">
                        
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
                                <button onClick={() => setShowMovement(stock.id)} className="text-slate-300 hover:text-slate-900 transition-colors">
                                    <FaExchangeAlt />
                                </button>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 italic mb-1">{stock.itemName}</h3>
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">
                                {stock.quantity} <span className="text-sm text-slate-400 font-bold not-italic">{stock.unit}</span>
                            </p>

                            {/* MOVEMENT FORM OVERLAY */}
                            {showMovement === stock.id && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col justify-center p-6 animate-in fade-in">
                                    <h4 className="text-center text-xs font-black uppercase mb-4">Mouvement de Stock</h4>
                                    <form onSubmit={handleMoveSubmit(onAddMovement)} className="space-y-3">
                                        <div className="flex gap-2">
                                            <select {...registerMove('type')} className="flex-1 p-2 bg-slate-100 rounded-lg text-xs font-bold">
                                                <option value="IN">Entrée (+)</option>
                                                <option value="OUT">Sortie (-)</option>
                                                <option value="WASTE">Perte (-)</option>
                                            </select>
                                            <input type="number" step="0.01" {...registerMove('quantity', { required: true })} placeholder="Qté" className="w-20 p-2 bg-slate-100 rounded-lg text-xs" />
                                        </div>
                                        <input {...registerMove('reason')} placeholder="Raison (ex: Vente)" className="w-full p-2 bg-slate-100 rounded-lg text-xs" />
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setShowMovement(null)} className="flex-1 py-2 bg-slate-200 rounded-lg text-xs font-bold">Annuler</button>
                                            <button type="submit" className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Valider</button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {stocks.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center text-slate-400">
                        <FaWarehouse className="mx-auto text-4xl mb-4 opacity-20" />
                        <p className="text-sm font-medium">Aucun stock dans cette ferme.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
