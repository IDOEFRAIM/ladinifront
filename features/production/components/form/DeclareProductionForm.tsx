'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Loader2, Sprout } from 'lucide-react';
import { C, F, GlassCard } from '@/features/production/components/tokens';
import { type Farm, UNIT_OPTIONS, PRODUCTION_TYPES, emptyForm } from '@/features/production/components/form/production-form.config';
import { inputStyle, Field, Toggle } from '@/features/production/components/form/ProductionFormParts';

type FormState = typeof emptyForm;

interface Props {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  farms: Farm[];
  submitting: boolean;
  onSubmit: () => void;
}

/** Formulaire de déclaration d'une production future (culture ou élevage). */
export default function DeclareProductionForm({ form, setForm, farms, submitting, onSubmit }: Props) {
  return (
    <GlassCard style={{ padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'grid', gap: 14 }}>
        <Field label="Type de production">
          <div style={{ display: 'flex', gap: 8 }}>
            {PRODUCTION_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setForm({ ...form, productionType: type.value as 'CROP' | 'LIVESTOCK' })}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `2px solid ${form.productionType === type.value ? C.forest : C.border}`,
                  background: form.productionType === type.value ? '#E6F4EF' : '#fff',
                  fontFamily: F.body,
                  fontWeight: 700,
                  color: form.productionType === type.value ? C.forest : C.muted,
                  cursor: 'pointer',
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Ferme">
          <select value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })} style={inputStyle}>
            <option value="">— Choisir —</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </Field>

        {form.productionType === 'CROP' ? (
          <Field label="Culture">
            <input value={form.productLabel} onChange={(e) => setForm({ ...form, productLabel: e.target.value })} placeholder="ex: Tomate" style={inputStyle} />
          </Field>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Espèce">
              <input value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} placeholder="ex: Poussin" style={inputStyle} />
            </Field>
            <Field label="Race / Souche">
              <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="optionnel" style={inputStyle} />
            </Field>
          </div>
        )}

        {form.productionType === 'CROP' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Récolte prévue">
              <input type="date" value={form.expectedHarvestDate} onChange={(e) => setForm({ ...form, expectedHarvestDate: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Unité">
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={inputStyle}>
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Stock actuel">
              <input min="1" type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Unité">
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={inputStyle}>
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Disponible le">
            <input type="date" value={form.estimatedAvailableAt} onChange={(e) => setForm({ ...form, estimatedAvailableAt: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Quantité (prév.)">
            <input type="number" inputMode="decimal" value={form.availableQuantity} onChange={(e) => setForm({ ...form, availableQuantity: e.target.value })} style={inputStyle} />
          </Field>
        </div>

        <Field label="Prix par unité (XOF)">
          <input type="number" inputMode="decimal" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} style={inputStyle} />
        </Field>

        <div style={{ display: 'flex', gap: 18 }}>
          <Toggle label="Public" checked={form.isPublic} onChange={(v) => setForm({ ...form, isPublic: v })} />
          <Toggle label="Précommandes" checked={form.preorderEnabled} onChange={(v) => setForm({ ...form, preorderEnabled: v })} />
        </div>

        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{
            padding: '14px', borderRadius: 14, background: C.emerald, color: 'white', border: 'none',
            cursor: submitting ? 'wait' : 'pointer', fontFamily: F.body, fontWeight: 800, fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <Sprout size={18} />}
          Enregistrer la production
        </button>
      </div>
    </GlassCard>
  );
}
