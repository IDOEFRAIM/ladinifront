'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { FaWarehouse } from 'react-icons/fa';
import { getFarms, getStocks, createStock, addStockMovement, createFarm } from '@/features/inventory/actions/inventory.actions';
import { useAuth } from '@/hooks/useAuth';
import type { StockType, Farm, Stock } from '@/features/inventory/components/manager/inventory-manager.types';
import FarmSelectorHeader from '@/features/inventory/components/manager/FarmSelectorHeader';
import AddFarmForm from '@/features/inventory/components/manager/AddFarmForm';
import AddStockForm from '@/features/inventory/components/manager/AddStockForm';
import StockCard from '@/features/inventory/components/manager/StockCard';

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
            <FarmSelectorHeader
              farms={farms}
              selectedFarmId={selectedFarmId}
              onSelectFarm={setSelectedFarmId}
              onToggleAddFarm={() => setShowAddFarm(!showAddFarm)}
              onNewStock={() => setShowAddStock(true)}
            />

            {showAddFarm && <AddFarmForm register={registerFarm} onSubmit={handleFarmSubmit(onAddFarm)} />}

            {showAddStock && (
              <AddStockForm register={registerStock} onSubmit={handleStockSubmit(onAddStock)} onClose={() => setShowAddStock(false)} />
            )}

            {/* STOCK LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stocks.map(stock => (
                    <StockCard
                        key={stock.id}
                        stock={stock}
                        movementOpen={showMovement === stock.id}
                        onOpenMovement={() => setShowMovement(stock.id)}
                        onCloseMovement={() => setShowMovement(null)}
                        register={registerMove}
                        onSubmit={handleMoveSubmit(onAddMovement)}
                    />
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
