import type { CampaignStatus, Rate } from './types';

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Brouillon',
  SCHEDULED: 'Programmée',
  RUNNING: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  FAILED: 'En échec',
};

export const RECIPIENT_STATUS_LABELS: Record<string, string> = {
  PREPARED: 'Préparé',
  QUEUED: 'En file',
  SENT: 'Accepté par WhatsApp',
  DELIVERED: 'Livré',
  READ: 'Lu',
  REPLIED: 'A répondu',
  FAILED: 'Échec',
  SKIPPED: 'Écarté',
};

/** Raisons d'exclusion d'une offre (backend eligibility.py). Une raison inconnue reste affichée telle quelle. */
const EXCLUSION_LABELS: Record<string, string> = {
  INACTIVE: 'Produit non actif',
  EXPIRED: 'Offre expirée',
  ZERO_QUANTITY: 'Quantité nulle',
  STALE: 'Disponibilité non confirmée récemment',
  PRODUCER_NOT_APPROVED: 'Producteur non approuvé',
  MISSING_FIELD: 'Information indispensable manquante',
  INCOMPATIBLE_UNIT: 'Unité incompatible',
  PAST_DELIVERY_DATE: 'Date de livraison dépassée',
  PRICE_REQUIRED: 'Prix fiable requis',
  OVER_LIMIT: 'Au-delà du nombre maximum d’offres',
};

export function exclusionLabel(reason: string): string {
  return EXCLUSION_LABELS[reason] ?? reason;
}

/** Raisons d'écart d'un destinataire — ciblage (MAJUSCULES, backend targeting.py) et envoi (minuscules, campaign_service / outbox).
 *  Une raison inconnue est affichée telle quelle : jamais masquée, jamais reformulée de façon trompeuse. */
const SKIP_LABELS: Record<string, string> = {
  NO_CONSENT: 'Pas de consentement',
  ACCOUNT_NOT_ACTIVE: 'Compte non actif',
  WHATSAPP_DISABLED: 'WhatsApp désactivé pour ce compte',
  INVALID_PHONE: 'Numéro invalide',
  REGION_UNKNOWN: 'Région inconnue',
  REGION_MISMATCH: 'Région hors cible',
  KIND_MISMATCH: 'Type d’audience non ciblé',
  DUPLICATE: 'Doublon (déjà ciblé)',
  opted_out: 'Désinscrit avant l’envoi',
  no_consent: 'Pas de consentement au moment de l’envoi',
  account_not_active: 'Compte devenu non actif',
  campaign_cancelled: 'Campagne annulée',
  template_required: 'Modèle WhatsApp requis (hors fenêtre de 24 h)',
  send_outcome_unknown: 'Issue d’envoi inconnue (non renvoyé automatiquement)',
  provider_failed: 'Refusé par le fournisseur',
  OPTED_OUT_RESPECTED: 'Désinscrit : le consentement n’est jamais rétabli par un import',
  CONSENT_ALREADY_RECORDED: 'Consentement déjà enregistré',
};

export function skipLabel(reason: string | null | undefined): string {
  if (!reason) return '—';
  return SKIP_LABELS[reason] ?? reason;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Valeur d'un `<input type="datetime-local">` (heure locale du navigateur) -> ISO sans fuseau, comme l'attend le backend. */
export function localInputToIso(value: string): string | null {
  return value ? `${value}:00`.slice(0, 19) : null;
}

export function isoToLocalInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 16) : '';
}

/** Un taux n'est JAMAIS affiché sans son dénominateur. `null` = non calculable (dénominateur nul). */
export function fmtRate(rate: Rate | undefined): string {
  if (!rate) return '—';
  const pct = rate.value === null ? 'n/a' : `${(rate.value * 100).toFixed(1).replace('.', ',')} %`;
  return `${pct} (${rate.numerator} / ${rate.denominator})`;
}

export function splitList(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const canEdit = (s: CampaignStatus) => s === 'DRAFT';
export const canValidate = (s: CampaignStatus) => s === 'DRAFT';
export const canCancel = (s: CampaignStatus) => s === 'DRAFT' || s === 'SCHEDULED' || s === 'RUNNING';
