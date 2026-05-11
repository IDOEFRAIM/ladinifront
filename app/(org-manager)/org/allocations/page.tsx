'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOrgAllocations,
  createOrgAllocation,
  updateOrgAllocation,
  deleteOrgAllocation,
  getAvailableZones,
} from '@/services/org-manager.service';
import { MessageBanner, PageSpinner, OrgModal, ModalFooter, Pagination, type BannerMessage } from '@/components/org/shared';
import { Package, Plus, Pencil, Trash2, Loader2, Check, Search } from 'lucide-react';

const UNITS = ['KG', 'G', 'PACK', 'TONNE', 'SACK'] as const;
const PAGE_SIZE = 10;

interface AllocationItem {
  id: string;
  seedType: string;
  totalQuantity: number;
  remainingQuantity: number;
  unit: string;
  zone: { id: string; name: string; code: string } | null;
  allocatedBy: { id: string; name: string } | null;
  createdAt: string;
}

interface ZoneOption { id: string; name: string; code: string }

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

  function usagePercent(a: AllocationItem) {
    if (!a.totalQuantity) return 0;
    return Math.round(((a.totalQuantity - a.remainingQuantity) / a.totalQuantity) * 100);
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
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Semence</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Total</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Restant</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Usage</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Zone</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-stone-400">
                  {search ? 'Aucun résultat.' : 'Aucune allocation. Créez-en une.'}
                </td></tr>
              ) : paginated.map(a => {
                const pct = usagePercent(a);
                return (
                  <tr key={a.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-stone-900">{a.seedType}</div>
                      <div className="text-xs text-stone-400">{a.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-stone-700">{a.totalQuantity.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right font-mono text-stone-700">{a.remainingQuantity.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 80 ? '#DC2626' : pct > 50 ? '#D97706' : '#059669' }} />
                        </div>
                        <span className="text-xs text-stone-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{a.zone?.name ?? <span className="text-stone-300">—</span>}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{new Date(a.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(a)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors" title="Modifier"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(a.id, a.seedType)} className="p-2 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors" title="Supprimer"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} count={filtered.length} onPageChange={setPage} />
      </div>

      {/* ─── Create Modal ───────────────────────────────────────────── */}
      {showCreate && (
        <OrgModal title="Nouvelle allocation" onClose={() => setShowCreate(false)}>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Type de semence *</label>
                <input type="text" value={formSeedType} onChange={e => setFormSeedType(e.target.value)} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Ex: Maïs, Sorgho..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Quantité *</label>
                  <input type="number" value={formQuantity as any} onChange={e => setFormQuantity(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none" min={1} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Unité</label>
                  <select value={formUnit} onChange={e => setFormUnit(e.target.value)} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Zone *</label>
                <select value={formZoneId} onChange={e => setFormZoneId(e.target.value)} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="">Choisir une zone...</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.code})</option>)}
                </select>
              </div>
          <ModalFooter onCancel={() => setShowCreate(false)} onConfirm={handleCreate} confirmLabel="Créer" saving={formSaving} disabled={!formSeedType.trim() || !formQuantity || !formZoneId} icon={<Check size={14} />} />
        </OrgModal>
      )}

      {/* ─── Edit Modal ─────────────────────────────────────────────── */}
      {showEdit && editAlloc && (
        <OrgModal title="Modifier l'allocation" onClose={() => setShowEdit(false)}>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Type de semence</label>
                <input type="text" value={editSeedType} onChange={e => setEditSeedType(e.target.value)} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Quantité totale</label>
                  <input type="number" value={editQuantity as any} onChange={e => setEditQuantity(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none" min={1} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Unité</label>
                  <select value={editUnit} onChange={e => setEditUnit(e.target.value)} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Zone</label>
                <select value={editZoneId} onChange={e => setEditZoneId(e.target.value)} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="">Choisir une zone...</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.code})</option>)}
                </select>
              </div>
          <ModalFooter onCancel={() => setShowEdit(false)} onConfirm={handleEdit} confirmLabel="Enregistrer" saving={editSaving} icon={<Check size={14} />} />
        </OrgModal>
      )}
    </div>
  );
}
