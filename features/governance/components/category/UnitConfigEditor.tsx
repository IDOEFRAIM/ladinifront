import { X } from 'lucide-react';
import { SUB_CATEGORY_UNITS, type SubCategoryUnit } from '@/lib/quantityUnit';
import { C } from '@/features/governance/components/category/category.config';

interface Props {
  subId: string;
  hasUnitConfig: boolean;
  allowed: SubCategoryUnit[];
  onToggleUnit: (unit: SubCategoryUnit) => void;
  priority: SubCategoryUnit | '';
  onPriorityChange: (unit: SubCategoryUnit) => void;
  loading: boolean;
  message: string | null;
  onSave: () => void;
  onClear: () => void;
  onCancel: () => void;
}

/** Éditeur des unités autorisées et de l'unité prioritaire (policy plateforme) d'une sous-catégorie. */
export default function UnitConfigEditor({ subId, hasUnitConfig, allowed, onToggleUnit, priority, onPriorityChange, loading, message, onSave, onClear, onCancel }: Props) {
  return (
<div style={{
  display: 'flex', flexDirection: 'column', gap: 10,
  marginTop: 10, padding: 12, borderRadius: 10,
  background: 'rgba(8,145,178,0.05)', border: `1px solid ${C.border}`,
}}>
  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
    Unités autorisées
  </label>
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {SUB_CATEGORY_UNITS.map((u) => {
      const checked = allowed.includes(u);
      return (
        <button
          key={u}
          type="button"
          onClick={() => onToggleUnit(u)}
          style={{
            padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700,
            border: `1px solid ${checked ? '#0891B2' : C.border}`,
            background: checked ? '#0891B2' : 'transparent',
            color: checked ? '#fff' : C.text,
            cursor: 'pointer',
          }}
        >
          {u}
        </button>
      );
    })}
  </div>

  <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
    Unité prioritaire (standardisation)
  </label>
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    {allowed.length === 0 && (
      <span style={{ fontSize: 12, color: C.muted }}>Cochez d&apos;abord une ou plusieurs unités ci-dessus.</span>
    )}
    {allowed.map((u) => (
      <label key={u} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
        <input
          type="radio"
          name={`priority-${subId}`}
          checked={priority === u}
          onChange={() => onPriorityChange(u)}
          disabled={allowed.length === 1}
        />
        {u}
      </label>
    ))}
  </div>

  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    <button onClick={() => onSave()} disabled={loading} style={{
      padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0891B2', color: '#fff',
      fontWeight: 700, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
    }}>
      {loading ? '...' : 'Enregistrer'}
    </button>
    {hasUnitConfig && (
      <button onClick={() => onClear()} disabled={loading} style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent',
        color: C.red, fontWeight: 600, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
      }}>
        <X size={13} /> Supprimer la config
      </button>
    )}
    <button onClick={() => onCancel} style={{
      padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 12,
    }}>
      Annuler
    </button>
    {message && <span style={{ fontSize: 12, color: C.red, width: '100%' }}>{message}</span>}
    <span style={{ fontSize: 11, color: C.muted, width: '100%' }}>
      L&apos;agent WhatsApp/webchat n&apos;acceptera que ces unités pour ce type de produit et utilisera l&apos;unité prioritaire pour standardiser. « Supprimer la config » restaure la devinette automatique historique.
    </span>
  </div>
</div>
  );
}
