'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getOrgDistributions, cancelOrgDistribution } from '@/services/org-manager.service';
import {
  DIST_STATUS_LABELS,
  DIST_STATUS_BADGE,
  DISTRIBUTION_STATUSES,
  isCancellable,
  type DistributionStatus,
} from '@/lib/distributionStateMachine';
import { List, Plus, Search, XCircle, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 12;

interface DistItem {
  id: string;
  allocationId: string;
  seedType: string | null;
  producer: { id: string; businessName: string; userName: string | null; email: string | null; phone: string | null } | null;
  agent: { id: string; name: string; email: string } | null;
  zone: { id: string; name: string } | null;
  quantity: number;
  status: string;
  attemptsCount: number;
  createdAt: string | null;
  receiptAt: string | null;
}

export default function OrgDistributionsPage() {
  const [distributions, setDistributions] = useState<DistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getOrgDistributions();
    if (res.success && res.data) setDistributions(res.data as DistItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = distributions;
    if (statusFilter !== 'ALL') {
      list = list.filter(d => d.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        (d.seedType || '').toLowerCase().includes(q) ||
        (d.producer?.businessName || '').toLowerCase().includes(q) ||
        (d.producer?.userName || '').toLowerCase().includes(q) ||
        (d.agent?.name || '').toLowerCase().includes(q) ||
        (d.zone?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [distributions, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    const s: Record<string, number> = { ALL: distributions.length };
    for (const d of distributions) { s[d.status] = (s[d.status] || 0) + 1; }
    return s;
  }, [distributions]);

  async function handleCancel(id: string) {
    if (!confirm('Annuler cette distribution en attente ?')) return;
    setMessage(null);
    const result = await cancelOrgDistribution(id);
    if (result.success) {
      setMessage({ type: 'success', text: 'Distribution annulee.' });
      load();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
  }

  function StatusBadge({ status }: { status: string }) {
    const s = status.toUpperCase() as DistributionStatus;
    const badge = DIST_STATUS_BADGE[s] || { bg: 'bg-stone-100', text: 'text-stone-500' };
    const label = DIST_STATUS_LABELS[s] || status;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
        {label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <List size={24} className="text-emerald-700" />
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Distributions de semences</h1>
          </div>
          <p className="text-sm text-stone-500">{distributions.length} distribution{distributions.length > 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/org/distributions/create"
          className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
        >
          <Plus size={16} /> Nouvelle distribution
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Stat pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Filter size={14} className="text-stone-400" />
        {(['ALL', ...DISTRIBUTION_STATUSES] as const).map(s => {
          const c = stats[s] || 0;
          const isActive = statusFilter === s;
          const label = s === 'ALL' ? 'Toutes' : DIST_STATUS_LABELS[s as DistributionStatus];
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isActive ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {label} ({c})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher par semence, producteur, agent, zone..."
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
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Producteur</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Agent</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Qty</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Statut</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Essais</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Zone</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-stone-400">
                  {search || statusFilter !== 'ALL' ? 'Aucun resultat pour ces filtres.' : 'Aucune distribution enregistree.'}
                </td></tr>
              ) : paginated.map(d => (
                <tr key={d.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-stone-900">{d.seedType || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-stone-900">{d.producer?.businessName || d.producer?.userName || '—'}</div>
                    {d.producer?.phone && <div className="text-xs text-stone-400">{d.producer.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{d.agent?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-stone-700">{d.quantity}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-center text-stone-500">{d.attemptsCount}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{d.zone?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="text-stone-500 text-xs">{d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—'}</div>
                    {d.receiptAt && <div className="text-emerald-600 text-xs">{new Date(d.receiptAt).toLocaleDateString('fr-FR')}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      {isCancellable(d.status) && (
                        <button onClick={() => handleCancel(d.id)} className="p-2 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors" title="Annuler">
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50">
            <span className="text-xs text-stone-500">{filtered.length} resultat{filtered.length > 1 ? 's' : ''} · Page {page}/{totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-stone-200 disabled:opacity-30 text-stone-500"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-stone-200 disabled:opacity-30 text-stone-500"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
