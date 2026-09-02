'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Plus, Sprout, Eye, EyeOff, CalendarClock, PackageCheck } from 'lucide-react';
import { C, F, GlassCard } from '@/components/productor/tokens';
import { getFarms } from '@/services/inventory.service';
import {
  declareProductionAction,
  getProducerProductionsAction,
  updateProductionVisibilityAction,
} from '@/app/actions/production.server';
import type { PublicProduction } from '@/services/production.service';

type Farm = { id: string; name: string; location: string | null };

const UNIT_OPTIONS = ['KG', 'TONNE', 'SAC', 'UNITE', 'TETE'] as const;
const PRODUCTION_TYPES = [
  { value: 'CROP', label: 'Culture' },
  { value: 'LIVESTOCK', label: 'Élevage' },
] as const;

// (2026-09-02) `crop_cycles` -> `market_offers` (schéma dégraissé) : les
// champs de suivi agronomique détaillé (superficie, date de semis, stock
// initial séparé, date d'éclosion, variété, stade de croissance) n'existent
// plus côté base — ce formulaire ne collecte donc plus que ce que
// `marketOffers` sait réellement stocker.
const emptyForm = {
  farmId: '',
  productLabel: '',
  productionType: 'CROP',
  expectedHarvestDate: '',
  estimatedAvailableAt: '',
  availableQuantity: '',
  pricePerUnit: '',
  unit: 'KG',
  isPublic: true,
  preorderEnabled: true,
  species: '',
  breed: '',
  currentStock: '',
};

export default function ProductionPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [productions, setProductions] = useState<PublicProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({
    availableQuantity: '',
    pricePerUnit: '',
    estimatedAvailableAt: '',
    preorderEnabled: true,
  });
  const [editing, setEditing] = useState<PublicProduction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [farmsRes, prodRes] = await Promise.all([getFarms(), getProducerProductionsAction()]);
      if (farmsRes.success && farmsRes.data) {
        setFarms(farmsRes.data.map((f) => ({ id: f.id, name: f.name, location: f.location })));
      }
      if (prodRes.success) setProductions(prodRes.data);
      else toast.error(prodRes.error);
    } catch {
      toast.error('Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (!form.farmId) return toast.error('Sélectionnez une ferme');
    if (!form.productLabel.trim() && form.productionType === 'CROP') return toast.error('Indiquez la culture');

    if (form.productionType === 'CROP') {
      if (!form.expectedHarvestDate) return toast.error('Date de récolte requise');
    } else {
      if (!form.species.trim() && !form.productLabel.trim()) return toast.error('Indiquez l’espèce élevage');
      if (!form.currentStock) return toast.error('Stock actuel requis');
    }

    setSubmitting(true);
    try {
      const payload: any = {
        farmId: form.farmId,
        productLabel: (form.productionType === 'LIVESTOCK' ? (form.productLabel || form.species) : form.productLabel).trim(),
        productionType: form.productionType,
        estimatedAvailableAt: form.estimatedAvailableAt || undefined,
        pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : undefined,
        unit: form.unit,
        isPublic: form.isPublic,
        preorderEnabled: form.preorderEnabled,
      };

      if (form.productionType === 'CROP') {
        payload.expectedHarvestDate = form.expectedHarvestDate;
        payload.availableQuantity = Number(form.availableQuantity) || 0;
      } else {
        payload.species = form.species.trim() || form.productLabel.trim();
        payload.breed = form.breed.trim() || undefined;
        payload.currentStock = Number(form.currentStock) || 0;
        payload.availableQuantity = Number(form.availableQuantity) || payload.currentStock;
      }

      const res = await declareProductionAction(payload);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Production déclarée');
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (p: PublicProduction) => {
    setEditing(p);
    setEditForm({
      availableQuantity: String(p.availableQuantity ?? ''),
      pricePerUnit: p.pricePerUnit ? String(p.pricePerUnit) : '',
      estimatedAvailableAt: p.estimatedAvailableAt ? new Date(p.estimatedAvailableAt).toISOString().slice(0, 10) : '',
      preorderEnabled: p.preorderEnabled ?? true,
    });
  };

  const handleEditSave = async () => {
    if (!editing) return;
    setSubmitting(true);
    try {
      const payload: any = { marketOfferId: editing.id };
      if (editForm.availableQuantity) payload.availableQuantity = Number(editForm.availableQuantity);
      if (editForm.pricePerUnit) payload.pricePerUnit = Number(editForm.pricePerUnit);
      if (editForm.estimatedAvailableAt) payload.estimatedAvailableAt = editForm.estimatedAvailableAt;
      payload.preorderEnabled = editForm.preorderEnabled;

      const res = await updateProductionVisibilityAction(payload);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Production mise à jour');
      setEditing(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVisibility = async (p: PublicProduction, field: 'isPublic' | 'preorderEnabled', value: boolean) => {
    const res = await updateProductionVisibilityAction({ marketOfferId: p.id, [field]: value });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    await load();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: F.heading, fontSize: '1.5rem', fontWeight: 900, color: C.forest }}>
            Production Future
          </h1>
          <p style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted }}>
            Déclarez vos récoltes à venir et activez les précommandes
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 14,
            background: C.forest, color: 'white', border: 'none', cursor: 'pointer',
            fontFamily: F.body, fontWeight: 700, fontSize: '0.8rem',
          }}
        >
          <Plus size={18} /> Déclarer
        </button>
      </div>

      {showForm && (
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
              onClick={handleSubmit}
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
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 size={28} className="animate-spin" color={C.emerald} />
        </div>
      ) : productions.length === 0 ? (
        <GlassCard style={{ padding: 40, textAlign: 'center' }}>
          <Sprout size={36} color={C.muted} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.85rem' }}>
            Aucune production future déclarée.
          </p>
        </GlassCard>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {productions.map((p) => (
            <GlassCard key={p.id} style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: F.heading, fontWeight: 800, color: C.text, fontSize: '1.05rem' }}>
                    {p.productLabel}
                    {p.productionType === 'LIVESTOCK' && p.species ? ` (${p.species}${p.breed ? ` · ${p.breed}` : ''})` : ''}
                  </h3>
                  <p style={{ fontFamily: F.body, fontSize: '0.75rem', color: C.muted, marginTop: 2 }}>
                    {p.farm.name} · {p.productionType === 'LIVESTOCK' ? 'Élevage' : 'Culture'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12, fontSize: '0.75rem', color: C.text }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <PackageCheck size={14} color={C.emerald} />
                      {p.availableQuantity - p.reservedQuantity}/{p.availableQuantity} {p.unit}
                    </span>
                    {p.pricePerUnit !== null && (
                      <span style={{ fontWeight: 700, color: C.forest }}>
                        {p.pricePerUnit.toLocaleString()} XOF
                      </span>
                    )}
                    {p.estimatedAvailableAt && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CalendarClock size={14} color={C.amber} />
                        {new Date(p.estimatedAvailableAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                    {p.productionType === 'LIVESTOCK' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <PackageCheck size={14} color={C.muted} />
                        {p.currentStock} tête(s) restantes
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <VisibilityButton
                  active={p.reservedQuantity >= 0}
                  icon={<PackageCheck size={14} />}
                  label={`${p.reservedQuantity} réservé(s)`}
                  readOnly
                />
                <button onClick={() => toggleVisibility(p, 'isPublic', true)} style={chipStyle(true)}>
                  <Eye size={14} /> Public
                </button>
                <button onClick={() => toggleVisibility(p, 'preorderEnabled', false)} style={chipStyle(false)}>
                  <EyeOff size={14} /> Stopper précommandes
                </button>
                <button onClick={() => openEdit(p)} style={chipStyle(true)}>
                  ✏️ Modifier
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <GlassCard style={{ width: '100%', maxWidth: 480, padding: 24, position: 'relative' }}>
            <button onClick={() => setEditing(null)} style={{ position: 'absolute', top: 12, right: 16, border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>×</button>
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
                onClick={handleEditSave}
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
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`,
  background: 'white', fontFamily: F.body, fontSize: '0.85rem', color: C.text, outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: F.body, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: C.muted, marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12,
        border: `1px solid ${checked ? C.emerald : C.border}`, background: checked ? 'rgba(16,185,129,0.08)' : 'white',
        color: checked ? C.forest : C.muted, cursor: 'pointer', fontFamily: F.body, fontWeight: 700, fontSize: '0.78rem',
      }}
    >
      {checked ? <Eye size={15} /> : <EyeOff size={15} />} {label}
    </button>
  );
}

function VisibilityButton({ icon, label }: { active: boolean; icon: React.ReactNode; label: string; readOnly?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(6,78,59,0.05)', color: C.forest, fontFamily: F.body, fontWeight: 700, fontSize: '0.72rem' }}>
      {icon} {label}
    </span>
  );
}

function chipStyle(positive: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
    border: `1px solid ${C.border}`, background: 'white',
    color: positive ? C.emerald : C.amber, cursor: 'pointer',
    fontFamily: F.body, fontWeight: 700, fontSize: '0.72rem',
  };
}
