'use client';

import { Plus } from 'lucide-react';
import { C } from '@/features/governance/components/category/category.config';
import type { useCategoryCreation } from '@/features/governance/components/category/useCategoryCreation';

interface Props {
  categoryId: string;
  isAdmin: boolean;
  creation: ReturnType<typeof useCategoryCreation>;
}

export default function AddSubCategory({ categoryId, isAdmin, creation }: Props) {
  return (
  creation.subCatFor === categoryId ? (
    <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
      <input placeholder="Nom de la sous-catégorie" value={creation.subCatName} onChange={e => creation.setSubCatName(e.target.value)}
        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }} />
      {isAdmin ? (
        <button onClick={() => creation.handleCreateSubCategory(categoryId)} disabled={creation.subLoading} style={{
        padding: '8px 14px', borderRadius: 8, border: 'none', background: C.emerald, color: '#fff',
        fontWeight: 700, fontSize: 12, cursor: creation.subLoading ? 'not-allowed' : 'pointer',
        }}>
          {creation.subLoading ? '...' : 'Ajouter'}
        </button>
      ) : (
        <div style={{ color: C.muted, fontSize: 13 }}>Seuls les administrateurs peuvent ajouter des sous-catégories.</div>
      )}
      <button onClick={() => { creation.setSubCatFor(null); creation.setSubMsg(null); }} style={{
        padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 12,
      }}>
        Annuler
      </button>
      {creation.subMsg && <span style={{ fontSize: 12, color: creation.subMsg.includes('créée') ? C.emerald : C.red }}>{creation.subMsg}</span>}
    </div>
  ) : (
    <button onClick={() => { creation.setSubCatFor(categoryId); creation.setSubCatName(''); creation.setSubMsg(null); }} style={{
      display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
      padding: '8px 14px', borderRadius: 8, border: `1px dashed ${C.border}`, background: 'transparent',
      cursor: 'pointer', color: C.emerald, fontWeight: 600, fontSize: 12,
    }}>
      <Plus size={14} /> Ajouter une sous-catégorie
    </button>
  )
  );
}
