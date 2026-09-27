export interface Stock {
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    type: 'INPUT' | 'HARVEST' | 'EQUIPMENT';
    updatedAt: Date;
    movements?: unknown[];
}
