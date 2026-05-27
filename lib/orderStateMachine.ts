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

/**
 * Statuts globaux (stricts) de commande.
 *
 * IMPORTANT:
 * - `PAID` existe encore dans le codebase historique mais n'est pas un statut global "v2".
 * - Pour éviter des ruptures, on accepte `PAID` en lecture et on le normalise vers `PROCESSING`
 *   pour les transitions et la timeline.
 */

export const ORDER_STATUSES_STRICT = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatusStrict = (typeof ORDER_STATUSES_STRICT)[number];

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

/** Transitions valides (strictes) : clé = statut actuel, valeur = statuts cibles autorisés */
const TRANSITIONS: Record<OrderStatusStrict, readonly OrderStatusStrict[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const DELIVERY_STATUSES = [
  'PENDING',
  'ASSIGNED',
  'PICKED_UP',
  'DELIVERED',
  'FAILED',
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

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

function normalizeOrderStatusStrict(input: string): OrderStatusStrict | null {
  const upper = (input || '').toUpperCase();
  // legacy alias
  if (upper === 'PAID') return 'PROCESSING';
  return (ORDER_STATUSES_STRICT as readonly string[]).includes(upper) ? (upper as OrderStatusStrict) : null;
}

function normalizeDeliveryStatus(input: string): DeliveryStatus {
  const upper = (input || 'PENDING').toUpperCase();
  return (DELIVERY_STATUSES as readonly string[]).includes(upper) ? (upper as DeliveryStatus) : 'PENDING';
}

// ── Guards ──────────────────────────────────────────────────────────────

/**
 * Vérifie si une transition est valide.
 */
export function canTransition(from: string, to: string): boolean {
  const fromStatus = normalizeOrderStatusStrict(from);
  const toStatus = normalizeOrderStatusStrict(to);
  if (!fromStatus || !toStatus) return false;
  return TRANSITIONS[fromStatus].includes(toStatus);
}

/**
 * Valide et retourne le statut cible normalisé, ou lance une erreur.
 */
export function assertTransition(from: string, to: string): OrderStatus {
  const fromNorm = normalizeOrderStatusStrict(from);
  const toNorm = normalizeOrderStatusStrict(to);

  if (!fromNorm) throw new Error(`Statut source inconnu : ${from}`);
  if (!toNorm) throw new Error(`Statut cible inconnu : ${to}`);

  if (!canTransition(fromNorm, toNorm)) {
    throw new Error(`Transition invalide : ${fromNorm} → ${toNorm}`);
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

// ── Timeline buyer (6 étapes) ──────────────────────────────────────────

export type BuyerTimelineStepId =
  | 'ORDER_PLACED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'COURIER_ASSIGNED'
  | 'IN_TRANSIT'
  | 'DELIVERED';

export interface BuyerTimelineStep {
  id: BuyerTimelineStepId;
  label: string;
  /** Étape considérée comme atteinte (activée) */
  active: boolean;
}

/**
 * Calcule la timeline Buyer (6 étapes) à partir du statut global de commande + statut livraison.
 */
export function getTimelineSteps(status: string, deliveryStatus: string): BuyerTimelineStep[] {
  const order = normalizeOrderStatusStrict(status) ?? 'PENDING';
  const delivery = normalizeDeliveryStatus(deliveryStatus);

  const confirmed = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order);
  const processing = ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order);

  const courierAssigned =
    (delivery !== 'PENDING' && delivery !== 'FAILED') ||
    order === 'SHIPPED' ||
    order === 'DELIVERED';

  const inTransit =
    delivery === 'PICKED_UP' ||
    order === 'SHIPPED' ||
    order === 'DELIVERED';

  const delivered = order === 'DELIVERED' || delivery === 'DELIVERED';

  return [
    { id: 'ORDER_PLACED', label: 'Commande passée', active: true },
    { id: 'CONFIRMED', label: 'Confirmée', active: confirmed },
    { id: 'PROCESSING', label: 'En préparation', active: processing },
    { id: 'COURIER_ASSIGNED', label: 'Livreur assigné', active: courierAssigned },
    { id: 'IN_TRANSIT', label: 'En route', active: inTransit },
    { id: 'DELIVERED', label: 'Livrée', active: delivered },
  ];
}
