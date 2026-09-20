'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getOrgAllocations, createOrgAllocation, updateOrgAllocation, deleteOrgAllocation } from '@/features/organization/actions/org-allocations.actions';
import { getAvailableZones } from '@/features/organization/actions/org-zones.actions';
import { MessageBanner, PageSpinner, type BannerMessage } from '@/features/organization/components/shared';
import { Package, Plus, Search } from 'lucide-react';
import { PAGE_SIZE, type AllocationItem, type ZoneOption } from '@/features/organization/components/allocations/allocations.config';
import AllocationsTable from '@/features/organization/components/allocations/AllocationsTable';
import AllocationFormModal from '@/features/organization/components/allocations/AllocationFormModal';

export default function OrgAllocationsPage() {
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<BannerMessage>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [formSeedType, setFormSeedType] = useState('');
  const [formQuantity, setFormQuantity] = useState<number | ''>('');
  const [formUnit, setFormUnit] = useState<string>('KG');
  const [formZoneId, setFormZoneId] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editAlloc, setEditAlloc] = useState<AllocationItem | null>(null);
  const [editSeedType, setEditSeedType] = useState('');
  const [editQuantity, setEditQuantity] = useState<number | ''>('');
  const [editUnit, setEditUnit] = useState('KG');
  const [editZoneId, setEditZoneId] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [allocRes, zonesRes] = await Promise.all([getOrgAllocations(), getAvailableZones()]);
    if (allocRes.success && allocRes.data) setAllocations(allocRes.data as AllocationItem[]);
    if (zonesRes.success && zonesRes.data) setZones((zonesRes.data as ZoneOption[]).map(z => ({ id: z.id, name: z.name, code: z.code ?? '' })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allocations;
    const q = search.toLowerCase();
    return allocations.filter(a =>
      a.seedType.toLowerCase().includes(q) ||
      (a.zone?.name || '').toLowerCase().includes(q)
    );
  }, [allocations, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Create ──────────────────────────────────────────────────────────
  function openCreate() {
    setFormSeedType('');
    setFormQuantity('');
    setFormUnit('KG');
    setFormZoneId(zones[0]?.id || '');
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!formSeedType.trim() || !formQuantity || !formZoneId) return;
    setFormSaving(true);
    setMessage(null);
    const result = await createOrgAllocation({
      seedType: formSeedType.trim(),
      totalQuantity: Number(formQuantity),
      unit: formUnit,
      zoneId: formZoneId,
    });
    if (result.success) {
      setMessage({ type: 'success', text: 'Allocation créée.' });
      setShowCreate(false);
      load();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
    setFormSaving(false);
  }

  // ─── Edit ────────────────────────────────────────────────────────────
  function openEdit(a: AllocationItem) {
    setEditAlloc(a);
    setEditSeedType(a.seedType);
    setEditQuantity(a.totalQuantity);
    setEditUnit(a.unit || 'KG');
    setEditZoneId(a.zone?.id || '');
    setShowEdit(true);
  }

  async function handleEdit() {
    if (!editAlloc) return;
    setEditSaving(true);
    setMessage(null);
    const result = await updateOrgAllocation(editAlloc.id, {
      seedType: editSeedType.trim() || undefined,
      totalQuantity: editQuantity ? Number(editQuantity) : undefined,
      unit: editUnit || undefined,
      zoneId: editZoneId || undefined,
    });
    if (result.success) {
      setMessage({ type: 'success', text: 'Allocation mise à jour.' });
      setShowEdit(false);
      load();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
    setEditSaving(false);
  }

  // ─── Delete ──────────────────────────────────────────────────────────
  async function handleDelete(id: string, seedType: string) {
    if (!confirm(`Supprimer l'allocation "${seedType}" ?`)) return;
    setMessage(null);
    const result = await deleteOrgAllocation(id);
    if (result.success) {
      setMessage({ type: 'success', text: 'Allocation supprimée.' });
      load();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Package size={24} className="text-emerald-700" />
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Allocations de semences</h1>
          </div>
          <p className="text-sm text-stone-500">{allocations.length} allocation{allocations.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
        >
          <Plus size={16} /> Nouvelle allocation
        </button>
      </div>

      <MessageBanner message={message} />

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher par type de semence ou zone..."
          className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        />
      </div>

      {/* Table */}
      <AllocationsTable
        allocations={paginated}
        search={search}
        page={page}
        totalPages={totalPages}
        count={filtered.length}
        onPageChange={setPage}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {showCreate && (
        <AllocationFormModal
          mode="create"
          seedType={formSeedType}
          onSeedTypeChange={setFormSeedType}
          quantity={formQuantity}
          onQuantityChange={setFormQuantity}
          unit={formUnit}
          onUnitChange={setFormUnit}
          zoneId={formZoneId}
          onZoneChange={setFormZoneId}
          zones={zones}
          saving={formSaving}
          onConfirm={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showEdit && editAlloc && (
        <AllocationFormModal
          mode="edit"
          seedType={editSeedType}
          onSeedTypeChange={setEditSeedType}
          quantity={editQuantity}
          onQuantityChange={setEditQuantity}
          unit={editUnit}
          onUnitChange={setEditUnit}
          zoneId={editZoneId}
          onZoneChange={setEditZoneId}
          zones={zones}
          saving={editSaving}
          onConfirm={handleEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
