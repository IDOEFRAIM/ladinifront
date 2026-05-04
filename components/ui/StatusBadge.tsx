'use client';

import React from 'react';
import {
  Clock, CheckCircle2, Truck, XCircle, User,
  CreditCard, AlertTriangle, Package, Gavel, Ban,
} from 'lucide-react';

/**
 * Unified StatusBadge — consistent colors across ALL dashboards.
 *
 * RULE: DELIVERED = always green, PENDING = always orange, etc.
 * Import this component everywhere instead of local badge definitions.
 */

type BadgeConfig = {
  color: string;
  bg: string;
  label: string;
  icon: any;
};

// ─── ORDER statuses ─────────────────────────────────────────────────────────
const ORDER_STATUS: Record<string, BadgeConfig> = {
  PENDING:    { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'En attente', icon: Clock },
  CONFIRMED:  { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', label: 'Confirmée', icon: CheckCircle2 },
  PAID:       { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: 'Payée', icon: CreditCard },
  SHIPPED:    { color: '#0891B2', bg: 'rgba(8,145,178,0.08)', label: 'Expédiée', icon: Truck },
  DELIVERED:  { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Livrée', icon: CheckCircle2 },
  CANCELLED:  { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Annulée', icon: XCircle },
};

// ─── DELIVERY statuses ──────────────────────────────────────────────────────
const DELIVERY_STATUS: Record<string, BadgeConfig> = {
  PENDING:     { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'En attente livreur', icon: Clock },
  ASSIGNED:    { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', label: 'Livreur assigné', icon: User },
  IN_TRANSIT:  { color: '#0891B2', bg: 'rgba(8,145,178,0.08)', label: 'En route', icon: Truck },
  DELIVERED:   { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Livré', icon: CheckCircle2 },
  FAILED:      { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Échouée', icon: AlertTriangle },
};

// ─── PAYMENT statuses ───────────────────────────────────────────────────────
const PAYMENT_STATUS: Record<string, BadgeConfig> = {
  PENDING:   { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'En attente', icon: Clock },
  PAID:      { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Payé', icon: CheckCircle2 },
  FAILED:    { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Échoué', icon: XCircle },
  REFUNDED:  { color: '#64748B', bg: 'rgba(100,116,139,0.08)', label: 'Remboursé', icon: Ban },
};

// ─── AUCTION statuses ───────────────────────────────────────────────────────
const AUCTION_STATUS: Record<string, BadgeConfig> = {
  OPEN:      { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'En cours', icon: Gavel },
  CLOSED:    { color: '#64748B', bg: 'rgba(100,116,139,0.08)', label: 'Fermée', icon: Ban },
  AWARDED:   { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Attribuée', icon: CheckCircle2 },
  CANCELLED: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Annulée', icon: XCircle },
};

const STATUS_MAPS: Record<string, Record<string, BadgeConfig>> = {
  order: ORDER_STATUS,
  delivery: DELIVERY_STATUS,
  payment: PAYMENT_STATUS,
  auction: AUCTION_STATUS,
};

const FALLBACK: BadgeConfig = { color: '#64748B', bg: 'rgba(100,116,139,0.08)', label: '—', icon: Clock };

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'delivery' | 'payment' | 'auction';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, type = 'order', size = 'sm' }: StatusBadgeProps) {
  const map = STATUS_MAPS[type] || ORDER_STATUS;
  const cfg = map[status] || FALLBACK;
  const Icon = cfg.icon;
  const isSmall = size === 'sm';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: isSmall ? 4 : 5,
      padding: isSmall ? '3px 10px' : '5px 14px',
      borderRadius: 100,
      background: cfg.bg, color: cfg.color,
      fontSize: isSmall ? 11 : 12,
      fontWeight: 700,
      fontFamily: "'Inter', sans-serif",
      whiteSpace: 'nowrap',
    }}>
      <Icon size={isSmall ? 11 : 13} /> {cfg.label}
    </span>
  );
}

// Re-export the config maps for use in stepper/progress components
export { ORDER_STATUS, DELIVERY_STATUS, PAYMENT_STATUS, AUCTION_STATUS };
