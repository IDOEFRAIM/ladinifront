export const fmtInt = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : new Intl.NumberFormat('fr-FR').format(Math.round(n)));

export const fmtPct = (r: number | null | undefined, digits = 0): string => (r === null || r === undefined ? '—' : `${(r * 100).toFixed(digits).replace('.', ',')} %`);

export function fmtMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1).replace('.', ',')} s`;
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
  return `${Math.floor(seconds / 3600)} h ${Math.round((seconds % 3600) / 60)} min`;
}

export function fmtAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export const fmtTime = (iso: string): string => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const fmtXof = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : `${fmtInt(n)} FCFA`);

/** Variation relative période courante vs précédente (pire = plus haut pour une latence). */
export function delta(current: number | null, previous: number | null): { pct: number | null; direction: 'up' | 'down' | 'flat' | null } {
  if (current === null || previous === null || previous === 0) return { pct: null, direction: null };
  const pct = (current - previous) / previous;
  return { pct, direction: Math.abs(pct) < 0.02 ? 'flat' : pct > 0 ? 'up' : 'down' };
}

const WORKFLOW_LABELS: Record<string, string> = {
  SALES_PUBLISH_PRODUCT: "Publication d'une offre",
  SALES_UPDATE_PRODUCT: "Modification d'une offre",
  SALES_UNPUBLISH_PRODUCT: "Retrait d'une offre",
  SALES_PLACE_BID: 'Offre sur une enchère (bid)',
  SALES_RECORD_DIRECT: 'Vente directe',
  STOCK_REGISTER_HARVEST: 'Déclaration de récolte',
  PROCUREMENT_CREATE_REQUEST: "Appel d'offres",
  PROCUREMENT_UPDATE_REQUEST: "Modification d'appel d'offres",
  BUYER_ADD_TO_CART: 'Ajout au panier',
  BUYER_CREATE_PREORDER: 'Précommande',
  BUYER_PREORDER_INIT: 'Précommande (initialisation)',
  BUYER_PREORDER_CONFIRM: 'Précommande (confirmation)',
  BUYER_CANCEL_ORDER: 'Annulation de commande (acheteur)',
  PRODUCER_CANCEL_ORDER: 'Annulation de commande (producteur)',
  PRODUCER_CONFIRM_ORDER: 'Confirmation de commande',
  PRODUCER_CONFIRM_DELIVERY_OTP: 'Confirmation de livraison (code)',
  PRODUCER_CONFIRM_DELIVERY_PAYMENT: 'Paiement à la livraison',
  BUYER_NEGOTIATE_PRICE: 'Négociation de prix',
  FINANCE_LOG_EXPENSE: 'Enregistrement de dépense',
  FARM_CREATE: 'Création de ferme',
};

/** Libellé lisible d'un workflow/intent ; les identifiants inconnus restent affichés tels quels (jamais masqués). */
export const workflowLabel = (id: string | null | undefined): string => (id ? WORKFLOW_LABELS[id] ?? id : '—');

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active', WAITING_USER: "En attente de l'utilisateur", STALLED: 'Bloquée', COMPLETED: 'Terminée', CLARIFICATION: 'Clarification',
  BLOCKED: 'Bloquée (sécurité)', ERROR: 'Erreur', HUMAN_REQUIRED: 'Humain requis', ABANDONED: 'Abandonnée',
};

export const STATE_COLORS = {
  HEALTHY: { fg: '#047857', bg: 'rgba(16,185,129,0.12)', label: 'HEALTHY' },
  DEGRADED: { fg: '#B45309', bg: 'rgba(217,119,6,0.14)', label: 'DEGRADED' },
  CRITICAL: { fg: '#B91C1C', bg: 'rgba(220,38,38,0.13)', label: 'CRITICAL' },
  UNKNOWN: { fg: '#64748B', bg: 'rgba(100,116,139,0.12)', label: 'UNKNOWN' },
} as const;

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#047857', WAITING_USER: '#1D4ED8', STALLED: '#B45309', COMPLETED: '#065F46', CLARIFICATION: '#7C3AED',
  BLOCKED: '#B91C1C', ERROR: '#B91C1C', HUMAN_REQUIRED: '#C2410C', ABANDONED: '#64748B',
};
