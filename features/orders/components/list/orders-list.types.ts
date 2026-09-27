// Types & Interfaces
export interface OrderItem { 
  id: string; 
  product: { name: string; unit?: string | null; images?: string[] | null }; 
  quantity: number; 
  priceAtSale: number; 
}

export interface Delivery { 
  id: string; 
  status: string; 
  deliveryCode?: string | null; 
  estimatedDistanceKm?: number | null; 
}

export interface Order { 
  id: string; 
  totalAmount: number; 
  status: string; 
  createdAt: string | Date; 
  items: OrderItem[]; 
  city?: string | null; 
  deliveryDesc?: string | null; 
  customerName: string; 
  customerPhone: string; 
  delivery?: Delivery | null; 
}
