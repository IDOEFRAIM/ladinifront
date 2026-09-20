'use client';

import { Plus } from 'lucide-react';
import { C } from '@/features/governance/components/buyer-types/buyer-types.config';

interface Props {
  isAdmin: boolean;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  creating: boolean;
  onCreate: () => void;
}

export default function BuyerTypeCreateForm({ isAdmin, name, onNameChange, description, onDescriptionChange, creating, onCreate }: Props) {
  return (
<div style={{
  background: C.glass, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16,
}}>
  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: C.forest }}>
    Ajouter un type d&apos;acheteur
  </h3>
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    <input
      placeholder="Nom (ex: Boutique, Restaurant, Grossiste…)"
      value={name}
      onChange={(e) => onNameChange(e.target.value)}
      disabled={!isAdmin}
      style={{
        flex: 1, minWidth: 220, padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${C.border}`, fontSize: 14,
        opacity: !isAdmin ? 0.7 : 1,
      }}
    />
    <input
      placeholder="Description (optionnel)"
      value={description}
      onChange={(e) => onDescriptionChange(e.target.value)}
      disabled={!isAdmin}
      style={{
        flex: 2, minWidth: 220, padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${C.border}`, fontSize: 14,
        opacity: !isAdmin ? 0.7 : 1,
      }}
    />
    <button
      onClick={onCreate}
      disabled={!isAdmin || creating}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 18px', borderRadius: 10, border: 'none',
        background: isAdmin ? C.forest : '#e5e7eb',
        color: isAdmin ? '#fff' : C.muted,
        fontWeight: 700, fontSize: 13,
        cursor: !isAdmin ? 'not-allowed' : 'pointer',
        opacity: creating ? 0.6 : 1,
      }}
    >
      <Plus size={16} />
      {creating ? 'Création...' : 'Créer'}
    </button>
  </div>
</div>
  );
}
