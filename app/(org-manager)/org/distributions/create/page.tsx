'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOrgAllocations,
  getOrgProducers,
  getOrgMembers,
  createOrgDistribution,
} from '@/services/org-manager.service';
import { MessageBanner, PageSpinner, type BannerMessage } from '@/components/org/shared';
import { ArrowLeft, Send, Loader2, Check, Search, Package, User, Users } from 'lucide-react';
import Link from 'next/link';

interface AllocOption { id: string; seedType: string; remainingQuantity: number; unit: string; zone: { id: string; name: string } | null }
interface ProducerOption { id: string; businessName: string; userName: string | null; email: string | null; phone: string | null; zone: { id: string; name: string } | null }
interface MemberOption { userId: string; userName: string | null; email: string | null; orgRole: string }

export default function CreateDistributionPage() {
  const [allocations, setAllocations] = useState<AllocOption[]>([]);
  const [producers, setProducers] = useState<ProducerOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<BannerMessage>(null);

  // Form state
  const [allocationId, setAllocationId] = useState('');
  const [producerId, setProducerId] = useState('');
  const [producerSearch, setProducerSearch] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [producerFocused, setProducerFocused] = useState(false);

  function mapAllocations(data: any[]): AllocOption[] {
    return data.filter(a => a.remainingQuantity > 0).map(a => ({
      id: a.id,
      seedType: a.seedType,
      remainingQuantity: a.remainingQuantity,
      unit: a.unit ?? 'KG',
      zone: a.zone,
    }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    const [aRes, pRes, mRes] = await Promise.all([
      getOrgAllocations(),
      getOrgProducers(),
      getOrgMembers(),
    ]);
    if (aRes.success && aRes.data) {
      const allocs = mapAllocations(aRes.data as any[]);
      setAllocations(allocs);
      if (allocs.length && !allocationId) setAllocationId(allocs[0].id);
    }
    if (pRes.success && pRes.data) {
      setProducers((pRes.data as any[]).map(p => ({
        id: p.id,
        businessName: p.businessName ?? '',
        userName: p.userName,
        email: p.email,
        phone: p.phone,
        zone: p.zone,
      })));
    }
    if (mRes.success && mRes.data) {
      setMembers((mRes.data as any[]).map(m => ({
        userId: m.userId ?? m.id,
        userName: m.user?.name ?? m.userName ?? m.name ?? null,
        email: m.user?.email ?? m.email ?? null,
        orgRole: m.role ?? m.orgRole ?? '',
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Producer search filtering
  const filteredProducers = useMemo(() => {
    if (!producerSearch.trim()) return producers.slice(0, 20);
    const q = producerSearch.toLowerCase();
    return producers.filter(p =>
      (p.businessName || '').toLowerCase().includes(q) ||
      (p.userName || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.zone?.name || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [producers, producerSearch]);

  const selectedAllocation = allocations.find(a => a.id === allocationId);
  const selectedProducer = producers.find(p => p.id === producerId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allocationId || !producerId || !quantity) return;
    setSaving(true);
    setMessage(null);

    const result = await createOrgDistribution({
      allocationId,
      producerId,
      quantity: Number(quantity),
      assignedTo: assignedTo || null,
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Distribution créée avec succès. Le code de vérification a été envoyé.' });
      setProducerId('');
      setProducerSearch('');
      setQuantity('');
      // Refresh allocations (remaining qty changed)
      const aRes = await getOrgAllocations();
      if (aRes.success && aRes.data) {
        setAllocations(mapAllocations(aRes.data as any[]));
      }
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur lors de la création.' });
    }
    setSaving(false);
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link href="/org/distributions" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-6">
        <ArrowLeft size={16} /> Retour aux distributions
      </Link>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <Send size={20} className="text-emerald-700" />
            <h1 className="text-xl font-extrabold text-stone-900">Nouvelle distribution</h1>
          </div>
          <p className="text-sm text-stone-500 mt-1">Attribuez des semences à un producteur depuis une allocation existante.</p>
        </div>

        <div className="mx-6 mt-5">
          <MessageBanner message={message} />
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Allocation */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
              <Package size={14} /> Allocation *
            </label>
            {allocations.length === 0 ? (
              <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                Aucune allocation avec du stock disponible. <Link href="/org/allocations" className="underline font-bold">Créer une allocation</Link>.
              </div>
            ) : (
              <select
                value={allocationId}
                onChange={e => setAllocationId(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {allocations.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.seedType} — {a.remainingQuantity} {a.unit} restant{a.remainingQuantity > 1 ? 's' : ''}{a.zone ? ` (${a.zone.name})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Producer search */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
              <User size={14} /> Producteur *
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={producerSearch}
                onChange={e => { setProducerSearch(e.target.value); setProducerId(''); }}
                onFocus={() => setProducerFocused(true)}
                onBlur={() => setTimeout(() => setProducerFocused(false), 200)}
                placeholder="Rechercher par nom, email ou zone..."
                className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            {/* Results */}
            {!producerId && producerFocused && (
              <div className="mt-1 max-h-48 overflow-y-auto border border-stone-200 rounded-lg bg-white shadow-sm">
                {filteredProducers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-stone-400">Aucun producteur trouvé.</div>
                ) : filteredProducers.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setProducerId(p.id); setProducerSearch(p.businessName || p.userName || p.email || p.id); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-b-0"
                  >
                    <div className="text-sm font-semibold text-stone-900">{p.businessName || p.userName || p.id}</div>
                    <div className="text-xs text-stone-400">{[p.email, p.phone, p.zone?.name].filter(Boolean).join(' · ')}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedProducer && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
                <span className="font-bold text-emerald-800">{selectedProducer.businessName || selectedProducer.userName}</span>
                {selectedProducer.email && <span className="text-emerald-600 ml-2">{selectedProducer.email}</span>}
                <button type="button" onClick={() => { setProducerId(''); setProducerSearch(''); }} className="ml-2 text-emerald-500 hover:text-emerald-700 text-xs underline">Changer</button>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Quantité *</label>
            <input
              type="number"
              value={quantity as any}
              onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              min={1}
              max={selectedAllocation?.remainingQuantity || 999999}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder={selectedAllocation ? `Max: ${selectedAllocation.remainingQuantity} ${selectedAllocation.unit}` : ''}
            />
            {selectedAllocation && quantity && Number(quantity) > selectedAllocation.remainingQuantity && (
              <div className="text-xs text-red-600 mt-1">Dépasse le stock restant ({selectedAllocation.remainingQuantity} {selectedAllocation.unit})</div>
            )}
          </div>

          {/* Assign to member (optional) */}
          {members.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
                <Users size={14} /> Agent assigné (optionnel)
              </label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">Moi-même (agent connecté)</option>
                {members.map(m => (
                  <option key={m.userId} value={m.userId}>
                    {m.userName || m.email || m.userId} — {m.orgRole}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Summary */}
          {selectedProducer && selectedAllocation && quantity && (
            <div className="px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-sm">
              <div className="font-bold text-stone-700 mb-1">Récapitulatif</div>
              <p className="text-stone-600">
                Le producteur <strong>{selectedProducer.businessName || selectedProducer.userName}</strong> recevra{' '}
                <strong>{quantity} {selectedAllocation.unit}</strong> de <strong>{selectedAllocation.seedType}</strong>.
                {assignedTo ? (
                  <> Le lot sera remis par <strong>{members.find(m => m.userId === assignedTo)?.userName || assignedTo}</strong>.</>
                ) : (
                  <> Le lot sera remis par l&apos;agent connecté.</>  
                )}
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/org/distributions" className="px-5 py-2.5 rounded-full text-sm font-bold text-stone-600 hover:bg-stone-100">Annuler</Link>
            <button
              type="submit"
              disabled={saving || !allocationId || !producerId || !quantity || (selectedAllocation ? Number(quantity) > selectedAllocation.remainingQuantity : false)}
              className="inline-flex items-center gap-2 bg-emerald-700 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-800 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Créer la distribution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
