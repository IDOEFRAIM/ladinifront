'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getOrgAllocations } from '@/features/organization/actions/org-allocations.actions';
import { getOrgProducers, getOrgMembers } from '@/features/organization/actions/org-members.actions';
import { createOrgDistribution } from '@/features/organization/actions/org-distributions.actions';
import { MessageBanner, PageSpinner, type BannerMessage } from '@/features/organization/components/shared';
import { ArrowLeft, Send, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import type { AllocOption, ProducerOption, MemberOption } from '@/features/organization/components/distribution-form/distribution-form.types';
import AllocationSelect from '@/features/organization/components/distribution-form/AllocationSelect';
import ProducerPicker from '@/features/organization/components/distribution-form/ProducerPicker';
import QuantityInput from '@/features/organization/components/distribution-form/QuantityInput';
import AgentSelect from '@/features/organization/components/distribution-form/AgentSelect';
import DistributionSummary from '@/features/organization/components/distribution-form/DistributionSummary';

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
          <AllocationSelect allocations={allocations} value={allocationId} onChange={setAllocationId} />

          <ProducerPicker
            producerSearch={producerSearch}
            onSearchInput={(value) => { setProducerSearch(value); setProducerId(''); }}
            onFocus={() => setProducerFocused(true)}
            onBlur={() => setTimeout(() => setProducerFocused(false), 200)}
            results={!producerId && producerFocused ? filteredProducers : null}
            onSelect={(p) => { setProducerId(p.id); setProducerSearch(p.businessName || p.userName || p.email || p.id); }}
            selectedProducer={selectedProducer}
            onClear={() => { setProducerId(''); setProducerSearch(''); }}
          />

          <QuantityInput quantity={quantity} onChange={setQuantity} selectedAllocation={selectedAllocation} />

          {members.length > 0 && <AgentSelect members={members} value={assignedTo} onChange={setAssignedTo} />}

          {selectedProducer && selectedAllocation && quantity && (
            <DistributionSummary producer={selectedProducer} allocation={selectedAllocation} quantity={quantity} assignedTo={assignedTo} members={members} />
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
