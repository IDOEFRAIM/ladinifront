/**
 * ORDER STATE MACHINE — Source unique de vérité pour les transitions de commande
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Statuts :
 *   PENDING     → Commande reçue, en attente de confirmation
 *   CONFIRMED   → Confirmée (COD) ou paiement validé
 *   PROCESSING  → En cours de préparation par le producteur
 *   PAID        → Paiement reçu (pour les pré-paiements)
 *   SHIPPED     → Expédiée / en route
 *   DELIVERED   → Livrée avec succès
 *   CANCELLED   → Annulée
 *
 * Règle : seule une transition valide est autorisée. Toute autre est rejetée.
 */

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Transitions valides : clé = statut actuel, valeur = statuts cibles autorisés */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING:    ['CONFIRMED', 'PROCESSING', 'PAID', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'PAID', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['PAID', 'SHIPPED', 'CANCELLED'],
  PAID:       ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED', 'CANCELLED'],
  DELIVERED:  [],
  CANCELLED:  [],
};

/** Statuts considérés comme "actifs" côté acheteur */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'PAID', 'SHIPPED',
];

/** Statuts qui déclenchent la création automatique d'une livraison */
export const DELIVERY_TRIGGER_STATUSES: readonly OrderStatus[] = [
  'CONFIRMED', 'PROCESSING', 'PAID', 'SHIPPED',
];

/** Mapping statut → événement notification acheteur */
export const STATUS_NOTIFICATION_MAP: Partial<Record<OrderStatus, string>> = {
  CONFIRMED:  'ORDER_CONFIRMED',
  PROCESSING: 'ORDER_PROCESSING',
  PAID:       'ORDER_PAID',
  SHIPPED:    'DELIVERY_PICKED_UP',
  DELIVERED:  'DELIVERY_COMPLETED',
  CANCELLED:  'DELIVERY_FAILED',
};

/** Labels lisibles pour l'UI */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:    'En attente',
  CONFIRMED:  'Confirmée',
  PROCESSING: 'En préparation',
  PAID:       'Payée',
  SHIPPED:    'Expédiée',
  DELIVERED:  'Livrée',
  CANCELLED:  'Annulée',
};

/** Couleurs pour les badges */
export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:    '#D97706',
  CONFIRMED:  '#2563EB',
  PROCESSING: '#7C3AED',
  PAID:       '#059669',
  SHIPPED:    '#0891B2',
  DELIVERED:  '#10B981',
  CANCELLED:  '#DC2626',
};

// ── Guards ──────────────────────────────────────────────────────────────

/**
 * Vérifie si une transition est valide.
 */
export function canTransition(from: string, to: string): boolean {
  const fromStatus = from.toUpperCase() as OrderStatus;
  const toStatus = to.toUpperCase() as OrderStatus;
  if (!TRANSITIONS[fromStatus]) return false;
  return TRANSITIONS[fromStatus].includes(toStatus);
}

/**
 * Valide et retourne le statut cible normalisé, ou lance une erreur.
 */
export function assertTransition(from: string, to: string): OrderStatus {
  const fromNorm = from.toUpperCase() as OrderStatus;
  const toNorm = to.toUpperCase() as OrderStatus;

  if (!ORDER_STATUSES.includes(fromNorm)) {
    throw new Error(`Statut source inconnu : ${from}`);
  }
  if (!ORDER_STATUSES.includes(toNorm)) {
    throw new Error(`Statut cible inconnu : ${to}`);
  }
  if (!canTransition(fromNorm, toNorm)) {
    throw new Error(
      `Transition invalide : ${STATUS_LABELS[fromNorm]} → ${STATUS_LABELS[toNorm]}`
    );
  }
  return toNorm;
}

/**
 * Détermine si un statut doit déclencher la création d'une livraison.
 */
export function shouldCreateDelivery(status: string): boolean {
  return DELIVERY_TRIGGER_STATUSES.includes(status.toUpperCase() as OrderStatus);
}

/**
 * Retourne le statut initial en fonction du mode de paiement.
 * COD (cash / mobile_money) → CONFIRMED (paiement à la livraison)
 * Autres → PENDING (en attente de confirmation de paiement)
 */
export function getInitialStatus(paymentMethod: string): OrderStatus {
  const upper = (paymentMethod || 'CASH').toUpperCase();
  return ['CASH', 'MOBILE_MONEY'].includes(upper) ? 'CONFIRMED' : 'PENDING';
}

/**
 * Retourne l'événement notification pour un statut donné, ou null.
 */
export function getNotificationEvent(status: string): string | null {
  return STATUS_NOTIFICATION_MAP[status.toUpperCase() as OrderStatus] ?? null;
}
