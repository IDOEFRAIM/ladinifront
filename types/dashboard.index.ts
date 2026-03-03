export type AssetNature = 'CROP' | 'LIVESTOCK';
export type AssetLifeCycle = 'LIVE' | 'DORMANT';
export type LocalUnit = 'SAC_100' | 'SAC_50' | 'TONNE' | 'KG' | 'UNITÉ' | 'LITRE';
export type StorageEnvironment = 'PLEIN_AIR' | 'VENTILÉ' | 'FRIGO' | 'SILO';

export interface AgrobusinessAsset {
    id: string;
    unitId: string;
    nature: AssetNature;
    lifecycle: AssetLifeCycle;
    name: string;
    quantity: number;      // <--- On utilise "quantity" partout
    unit: LocalUnit;      // <--- On utilise "unit" partout
    purchasePrice: number;
    marketPrice: number;
    entryDate: string;
    isPerishable: boolean;
    storage?: StorageEnvironment; // <--- Optionnel car absent si lifecycle === 'LIVE'
    expectedHarvestDate?: string;
}