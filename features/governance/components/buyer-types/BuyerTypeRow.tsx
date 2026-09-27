'use client';

import { Pencil, Save, X } from 'lucide-react';
import { C, type BuyerType } from '@/features/governance/components/buyer-types/buyer-types.config';

interface Props {
  row: BuyerType;
  isAdmin: boolean;
  isEditing: boolean;
  saving: boolean;
  editName: string;
  onEditNameChange: (value: string) => void;
  editDescription: string;
  onEditDescriptionChange: (value: string) => void;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function BuyerTypeRow({
  row, isAdmin, isEditing, saving, editName, onEditNameChange, editDescription, onEditDescriptionChange, onStartEdit, onCancel, onSave,
}: Props) {
  return (
  <div style={{
    border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10,
    background: isEditing ? 'rgba(16,185,129,0.04)' : 'transparent',
  }}>
    {!isEditing ? (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontWeight: 800, color: C.forest }}>{row.name}</div>
          {row.description && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{row.description}</div>}
        </div>
        <button
          onClick={() => onStartEdit()}
          disabled={!isAdmin}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            cursor: !isAdmin ? 'not-allowed' : 'pointer',
            color: C.muted,
            opacity: !isAdmin ? 0.6 : 1,
            fontWeight: 700,
          }}
        >
          <Pencil size={16} /> Modifier
        </button>
      </div>
    ) : (
      <div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            style={{ flex: 1, minWidth: 220, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }}
          />
          <input
            value={editDescription}
            onChange={(e) => onEditDescriptionChange(e.target.value)}
            placeholder="Description (optionnel)"
            style={{ flex: 2, minWidth: 220, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              cursor: saving ? 'not-allowed' : 'pointer',
              color: C.muted,
              fontWeight: 700,
            }}
          >
            <X size={16} /> Annuler
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 10,
              border: 'none',
              background: C.emerald,
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              fontWeight: 800,
            }}
          >
            <Save size={16} /> {saving ? '...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    )}
  </div>
  );
}
