'use client';

import { C } from '@/features/governance/components/category/category.config';

interface Props {
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  loading: boolean;
  message: string | null;
  onCreate: () => void;
  onCancel: () => void;
}

export default function CategoryCreateForm({ name, onNameChange, description, onDescriptionChange, loading, message, onCreate, onCancel }: Props) {
  return (
  <div style={{
    background: C.glass, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 20,
  }}>
    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: C.forest }}>Créer une catégorie</h3>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <input placeholder="Nom de la catégorie" value={name} onChange={e => onNameChange(e.target.value)}
        style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
      <input placeholder="Description (optionnel)" value={description} onChange={e => onDescriptionChange(e.target.value)}
        style={{ flex: 2, minWidth: 200, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
      <button onClick={onCreate} disabled={loading} style={{
        padding: '10px 20px', borderRadius: 8, border: 'none', background: C.emerald, color: '#fff',
        fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
      }}>
        {loading ? '...' : 'Créer'}
      </button>
      <button onClick={onCancel} style={{
        padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer',
      }}>
        Annuler
      </button>
    </div>
    {message && <div style={{ marginTop: 8, fontSize: 13, color: message.includes('créée') ? C.emerald : C.red }}>{message}</div>}
  </div>
  );
}
