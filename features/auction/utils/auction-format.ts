export const geoPriorityLabel = (p: number) => {
  if (p === 1) return { text: 'Zone locale', color: 'bg-emerald-100 text-emerald-800' };
  if (p === 2) return { text: 'Zone voisine', color: 'bg-amber-100 text-amber-800' };
  return { text: 'Région élargie', color: 'bg-stone-100 text-stone-700' };
};

export const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  OPEN: { label: 'En cours', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  CLOSED: { label: 'Fermée', bg: 'bg-stone-200', text: 'text-stone-700' },
  AWARDED: { label: 'Attribuée', bg: 'bg-blue-100', text: 'text-blue-800' },
  CANCELLED: { label: 'Annulée', bg: 'bg-red-100', text: 'text-red-800' },
};

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function incotermHelp(incoterm?: string | null) {
  const key = (incoterm || '').toUpperCase();
  const map: Record<string, string> = {
    DDP: "DDP : le vendeur livre jusqu'à votre site (formalités à sa charge).",
    EXW: 'EXW : à récupérer à la ferme / entrepôt du vendeur.',
    FCA: 'FCA : remis au transporteur à un point convenu.',
    CIP: "CIP : transport assuré jusqu'au lieu convenu.",
    CPT: "CPT : transport payé jusqu'au lieu convenu.",
  };
  return map[key] || "Incoterm : condition de livraison convenue entre acheteur et vendeur.";
}
