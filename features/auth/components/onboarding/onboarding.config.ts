import { Leaf, ShoppingCart, Truck } from 'lucide-react';

// ── Design tokens ──────────────────────────────────────────────────────
export const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
  danger: '#DC2626',
};

export const STEPS = ['Rôle', 'Zone', 'Organisation', 'Détails', 'Confirmation'] as const;

export type Step = 0 | 1 | 2 | 3 | 4;

export const ROLES = [
  { value: 'PRODUCER' as const, label: 'Producteur', desc: 'Je produis et vends des récoltes', icon: Leaf, color: '#10B981' },
  { value: 'BUYER' as const, label: 'Acheteur B2B', desc: 'Je suis restaurateur, hôtelier ou revendeur', icon: ShoppingCart, color: '#D97706' },
  { value: 'AGENT' as const, label: 'Livreur', desc: 'Je livre les commandes sur le terrain', icon: Truck, color: '#3B82F6' },
] as const;

export const ORG_TYPES = [
  { value: 'COOPERATIVE', label: 'Coopérative' },
  { value: 'GOVERNMENT_REGIONAL', label: 'Gouvernement régional' },
  { value: 'NGO', label: 'ONG' },
  { value: 'PRIVATE_TRADER', label: 'Commerçant privé' },
  { value: 'RESELLER', label: 'Revendeur' },
] as const;

export type OnboardingRole = 'PRODUCER' | 'BUYER' | 'AGENT';

export type ZoneOption = { id: string; name: string; code: string };

export type OrgOption = { id: string; name: string; type: string };

export type BuyerTypeOption = { id: string; name: string; description: string | null };

// ── Onboarding State ──────────────────────────────────────────────────
export interface OnboardingState {
  role: OnboardingRole | null;
  zoneId: string | null;
  organizationId: string | null;
  createOrg: boolean;
  orgName: string;
  orgType: string;
  orgTaxId: string;
  orgDescription: string;
  // Role-specific
  businessName: string;
  buyerTypeId: string | null;
  establishmentName: string;
  defaultDeliveryAddress: string;
  vehicleType: string;
  licenseNumber: string;
}

export const initialState: OnboardingState = {
  role: null, zoneId: null, organizationId: null, createOrg: false,
  orgName: '', orgType: 'COOPERATIVE', orgTaxId: '', orgDescription: '',
  businessName: '', buyerTypeId: null, establishmentName: '', defaultDeliveryAddress: '',
  vehicleType: '', licenseNumber: '',
};
