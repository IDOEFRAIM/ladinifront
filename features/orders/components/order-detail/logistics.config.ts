import type React from 'react';
import { FaSearch, FaClock, FaTruck, FaCheckCircle, FaBoxOpen } from 'react-icons/fa';

export interface LogisticsStep {
  label: string;
  next: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  theme: string;
}

export const LOGISTICS_STEPS: Record<string, LogisticsStep> = {
  PENDING: { label: 'Confirmer la commande', next: 'CONFIRMED', icon: FaClock, theme: 'bg-[#5B4636]' },
  CONFIRMED: { label: 'Marquer en préparation', next: 'PROCESSING', icon: FaBoxOpen, theme: 'bg-[#5B4636]' },
  PROCESSING: { label: 'Mettre en livraison', next: 'SHIPPED', icon: FaTruck, theme: 'bg-[#497A3A]' },
  SHIPPED: { label: 'Marquer comme livré', next: 'DELIVERED', icon: FaCheckCircle, theme: 'bg-green-600' },
  DELIVERED: { label: 'Commande Terminée', next: '', icon: FaCheckCircle, theme: 'bg-[#A4A291]' },
  CANCELLED: { label: 'Commande Annulée', next: '', icon: FaSearch, theme: 'bg-red-500' }
};
