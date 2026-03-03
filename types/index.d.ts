// types/index.d.ts

import type { Role as PrismaSystemRole } from '@prisma/client';

// --- 1. TYPES GÉNÉRAUX ET UTILISATEURS ---

/** Re-export du SystemRole Prisma comme source de vérité */
export type SystemRole = PrismaSystemRole;
/** @deprecated Use SystemRole instead */
export type Role = PrismaSystemRole;

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface User {
  id: string;
  email: string;
  role: SystemRole;
  name: string;
  phone?: string;
  location?: Location;

  producerProfile?: {
    id: string;
    businessName: string;
    status: string;
    region?: string;
  };
}

// --- 2. TYPES DU CATALOGUE ET DES PRODUITS ---

export interface Product {
  id: string;
  producerId: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  price: number;
  // Current schema uses `quantityForSale` but many components reference `stock`.
  stock?: number;
  quantityForSale?: number;
  quantity?: number;
  images: string[];
  location?: Location;
  createdAt: Date;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: Location;
  searchQuery?: string;
}

// --- 3. TYPES DES TRANSACTIONS ET COMMANDES ---

export type OrderStatus =
  | 'PENDING'
  | 'STOCK_RESERVED'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'FAILED';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  productNameSnapshot: string;
}

export interface Order {
  id: string;
  buyerId: string;
  producerId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  paymentId?: string;
  shippingAddress: Location;
  createdAt: Date;
  updatedAt: Date;
}

// --- 4. TYPES DES RÉCLAMATIONS ---

export type ClaimStatus = 'OPEN' | 'IN_REVIEW' | 'AWAITING_RESPONSE' | 'RESOLVED' | 'CLOSED';

export interface Claim {
  id: string;
  orderId: string;
  reporterId: string;
  reportedAgainstId: string;
  type: 'DELIVERY_ISSUE' | 'QUALITY_ISSUE' | 'PAYMENT_ISSUE' | 'OTHER';
  description: string;
  status: ClaimStatus;
  resolutionDetails?: string;
  createdAt: Date;
}

// --- 5. TYPES DES DONNÉES IA / MARCHÉ ---

export interface MarketTrend {
  id: string;
  productCategory: string;
  trendDate: Date;
  currentAvgPrice: number;
  prediction7Days: number;
  dataSources: string[];
}