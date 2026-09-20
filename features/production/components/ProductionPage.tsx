'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Plus, Sprout } from 'lucide-react';
import { C, F, GlassCard } from '@/features/production/components/tokens';
import { getFarms } from '@/features/inventory/actions/inventory.actions';
import { declareProductionAction, getProducerProductionsAction, updateProductionVisibilityAction } from '@/features/production/actions/production.actions';
import type { PublicProduction } from '@/features/production/services/production.service';
import { type Farm, emptyForm } from '@/features/production/components/form/production-form.config';
import DeclareProductionForm from '@/features/production/components/form/DeclareProductionForm';
import ProductionCard from '@/features/production/components/form/ProductionCard';
import EditProductionModal from '@/features/production/components/form/EditProductionModal';

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
        <DeclareProductionForm form={form} setForm={setForm} farms={farms} submitting={submitting} onSubmit={handleSubmit} />
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
            <ProductionCard key={p.id} production={p} onToggleVisibility={toggleVisibility} onEdit={openEdit} />
          ))}
        </div>
      )}

      {editing && (
        <EditProductionModal editForm={editForm} setEditForm={setEditForm} submitting={submitting} onSave={handleEditSave} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
