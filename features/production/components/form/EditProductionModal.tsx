'use client';

import type { Dispatch, SetStateAction } from 'react';
import { C, F, GlassCard } from '@/features/production/components/tokens';
import { inputStyle, Field, Toggle } from '@/features/production/components/form/ProductionFormParts';

export interface EditFormState {
  availableQuantity: string;
  pricePerUnit: string;
  estimatedAvailableAt: string;
  preorderEnabled: boolean;
}

interface Props {
  editForm: EditFormState;
  setEditForm: Dispatch<SetStateAction<EditFormState>>;
  submitting: boolean;
  onSave: () => void;
  onClose: () => void;
}

export default function EditProductionModal({ editForm, setEditForm, submitting, onSave, onClose }: Props) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <GlassCard style={{ width: '100%', maxWidth: 480, padding: 24, position: 'relative' }}>
        <button onClick={() => onClose()} style={{ position: 'absolute', top: 12, right: 16, border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>×</button>
        <h3 style={{ fontFamily: F.heading, fontWeight: 800, color: C.forest, marginBottom: 20 }}>Modifier la production</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Quantité disponible">
            <input type="number" value={editForm.availableQuantity} onChange={(e) => setEditForm({ ...editForm, availableQuantity: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Prix par unité (XOF)">
            <input type="number" value={editForm.pricePerUnit} onChange={(e) => setEditForm({ ...editForm, pricePerUnit: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Disponible le">
            <input type="date" value={editForm.estimatedAvailableAt} onChange={(e) => setEditForm({ ...editForm, estimatedAvailableAt: e.target.value })} style={inputStyle} />
          </Field>
          <Toggle label="Précommandes" checked={editForm.preorderEnabled} onChange={(v) => setEditForm({ ...editForm, preorderEnabled: v })} />
          <button
            onClick={onSave}
            disabled={submitting}
            style={{
              padding: '12px', borderRadius: 14, background: C.forest, color: 'white', border: 'none',
              fontFamily: F.body, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer'
            }}
          >
            {submitting ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
