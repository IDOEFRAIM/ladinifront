'use client';

import { User, Truck, Clock, CheckCircle2, XCircle } from 'lucide-react';

// Mappings d'états
export const STATUS_MAP: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  PENDING: { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'En attente', icon: Clock },
  CONFIRMED: { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', label: 'Confirmée', icon: CheckCircle2 },
  PAID: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: 'Payée', icon: CheckCircle2 },
  SHIPPED: { color: '#0891B2', bg: 'rgba(8,145,178,0.08)', label: 'Expédiée', icon: Truck },
  DELIVERED: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Livrée', icon: CheckCircle2 },
  CANCELLED: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Annulée', icon: XCircle },
};

export const DELIVERY_STATUS_MAP: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  PENDING: { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'Attente livreur', icon: Clock },
  ASSIGNED: { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', label: 'Livreur assigné', icon: User },
  IN_TRANSIT: { color: '#0891B2', bg: 'rgba(8,145,178,0.08)', label: 'En route', icon: Truck },
  DELIVERED: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Livré', icon: CheckCircle2 },
  FAILED: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Échouée', icon: XCircle },
};

// --- Sous-Composants ---
