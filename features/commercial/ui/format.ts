/** Formatage et constantes de l'espace COMMERCIAL. Aucune logique métier : tout vient du backend. */

export const STATUS_LABELS: Record<string, string> = {
  NONE: 'Aucun suivi',
  TO_FOLLOW_UP: 'À relancer',
  FOLLOWED_UP: 'Relancé',
  RESOLVED: 'Résolu',
  NOT_INTERESTED: 'Pas intéressé',
};

export const ROLE_LABELS: Record<string, string> = {
  PRODUCER: 'Producteur',
  BUYER: 'Acheteur',
  ADMIN: 'Admin',
  SUPERADMIN: 'Super admin',
  COMMERCIAL: 'Commercial',
  USER: 'Utilisateur',
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Rôle inconnu';
  return ROLE_LABELS[role] ?? role;
}

export function fmtAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—';
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

/** « 14:05 » — heure locale d'un message. */
export function fmtClock(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** « Aujourd'hui » / « Hier » / « 4 octobre » — séparateur de jour d'une conversation. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Limite du backend (`send_follow_up`) : 2000 caractères. */
export const MAX_MESSAGE_LENGTH = 2000;

export const QUICK_REPLIES: string[] = [
  "Bonjour, avez-vous toujours besoin d'aide pour votre activité sur Ladini ?",
  "Bonjour, nous avons remarqué que votre demande n'est pas terminée. Souhaitez-vous la reprendre ?",
  'Bonjour, une nouvelle opportunité est disponible sur Ladini. Répondez à ce message pour en profiter.',
];
