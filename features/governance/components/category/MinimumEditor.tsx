import { X } from 'lucide-react';
import { C, ORDER_UNITS } from '@/features/governance/components/category/category.config';

interface Props {
  hasMinimum: boolean;
  qty: string;
  onQtyChange: (value: string) => void;
  unit: string;
  onUnitChange: (value: string) => void;
  loading: boolean;
  message: string | null;
  onSave: () => void;
  onClear: () => void;
  onCancel: () => void;
}

/** Éditeur du seuil minimum de commande (policy plateforme) d'une sous-catégorie. */
export default function MinimumEditor({ hasMinimum, qty, onQtyChange, unit, onUnitChange, loading, message, onSave, onClear, onCancel }: Props) {
  return (
<div style={{
  display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
  marginTop: 10, padding: 12, borderRadius: 10,
  background: 'rgba(217,119,6,0.05)', border: `1px solid ${C.border}`,
}}>
  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
    Quantité minimale de commande
  </label>
  <input
    type="number" min={0} step="any" placeholder="ex: 50"
    value={qty} onChange={e => onQtyChange(e.target.value)}
    style={{ width: 110, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }}
  />
  <select
    value={unit} onChange={e => onUnitChange(e.target.value)}
    disabled={qty.trim() === ''}
    style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }}
  >
    {ORDER_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
  </select>
  <button onClick={() => onSave()} disabled={loading} style={{
    padding: '8px 16px', borderRadius: 8, border: 'none', background: C.emerald, color: '#fff',
    fontWeight: 700, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
  }}>
    {loading ? '...' : 'Enregistrer'}
  </button>
  {hasMinimum && (
    <button onClick={() => onClear()} disabled={loading} style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent',
      color: C.red, fontWeight: 600, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
    }}>
      <X size={13} /> Supprimer le seuil
    </button>
  )}
  <button onClick={onCancel} style={{
    padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 12,
  }}>
    Annuler
  </button>
  {message && <span style={{ fontSize: 12, color: C.red, width: '100%' }}>{message}</span>}
  <span style={{ fontSize: 11, color: C.muted, width: '100%' }}>
    Aucune commande de ce type de produit ne pourra être poursuivie en dessous de ce seuil — quel que soit le producteur. Laissez le champ vide puis « Enregistrer » (ou « Supprimer le seuil ») pour revenir au comportement historique (aucune règle).
  </span>
</div>
  );
}
