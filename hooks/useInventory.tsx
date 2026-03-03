'use client';

import { useMemo } from 'react';
import { AgrobusinessAsset } from '@/types/dashboard.index'; // Import du type unique

export const useInventory = (items: AgrobusinessAsset[], activeUnit: string, currentTemp: number = 35) => {
    
    const inventoryLogic = useMemo(() => {
        const filteredItems = activeUnit === 'global' 
            ? items 
            : items.filter(item => item.unitId === activeUnit);

        // 1. CALCUL DES VOLUMES EN UNITÉS LOCALES (Correction des noms de propriétés)
        const volumeInSacs = filteredItems.reduce((acc, item) => {
            if (item.unit === 'SAC_100') return acc + (item.quantity / 100);
            return acc;
        }, 0);

        // 2. VALEUR FINANCIÈRE EN FCFA
        const totalValue = filteredItems.reduce((acc, item) => acc + (item.quantity * item.marketPrice), 0);

        // 3. INDEX DE RISQUE SAHÉLIEN
        const itemsAtRisk = filteredItems.map(item => {
            const ageInDays = (new Date().getTime() - new Date(item.entryDate).getTime()) / (1000 * 3600 * 24);
            
            // On vérifie si storage existe (car optionnel dans le type)
            let heatFactor = (currentTemp > 38 && item.storage === 'PLEIN_AIR') ? 2 : 1;
            const riskThreshold = item.isPerishable ? (5 / heatFactor) : (120 / heatFactor);
            
            return {
                ...item,
                ageInDays,
                riskLevel: ageInDays > riskThreshold ? 'CRITIQUE' : ageInDays > (riskThreshold * 0.7) ? 'ALERTE' : 'STABLE'
            };
        });

        const currentMonth = new Date().getMonth(); 
        const isSoudureApproaching = currentMonth >= 3 && currentMonth <= 5;

        return {
            filteredItems: itemsAtRisk,
            totalValue,
            volumeInSacs: Math.round(volumeInSacs),
            criticalCount: itemsAtRisk.filter(i => i.riskLevel === 'CRITIQUE').length,
            marketStrategy: isSoudureApproaching ? "Soudure proche : Stockez." : "Flux normal.",
            healthScore: itemsAtRisk.length > 0 ? 100 - (itemsAtRisk.filter(i => i.riskLevel !== 'STABLE').length * 10) : 100
        };
    }, [items, activeUnit, currentTemp]);

    return inventoryLogic;
};