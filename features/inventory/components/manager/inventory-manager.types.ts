export type StockType = 'INPUT' | 'HARVEST' | 'EQUIPMENT';

export interface Farm {
    id: string;
    name: string;
    location: string | null;
}

export interface Stock {
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    type: StockType;
    updatedAt: Date;
}
