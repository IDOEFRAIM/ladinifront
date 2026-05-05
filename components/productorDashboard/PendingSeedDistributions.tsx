'use client';

import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface PendingDist {
  id: string;
  seedType: string;
  quantity: number;
  unit: string;
  agentName: string | null;
  createdAt: string;
}

export default function PendingSeedDistributions() {
  const [distributions, setDistributions] = useState<PendingDist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/producer/pending-distributions');
        if (res.ok) {
          const data = await res.json();
          setDistributions(data.distributions || []);
        }
      } catch (e) {
        // silent fail
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-emerald-600" />
        </div>
      </div>
    );
  }

  if (distributions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Package size={18} className="text-amber-700" />
        <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
          Semences en attente
        </h3>
        <span className="ml-auto text-xs font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
          {distributions.length}
        </span>
      </div>

      <div className="space-y-2">
        {distributions.slice(0, 5).map(d => (
          <Link
            key={d.id}
            href={`/distributions/verify/${d.id}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-amber-100 hover:border-amber-300 transition-colors group"
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{d.seedType}</p>
              <p className="text-xs text-stone-500">
                {d.quantity} {d.unit}{d.agentName ? ` · par ${d.agentName}` : ''}
              </p>
            </div>
            <ChevronRight size={16} className="text-stone-300 group-hover:text-amber-600 transition-colors" />
          </Link>
        ))}
      </div>

      {distributions.length > 5 && (
        <Link href="/distributions" className="block text-center text-xs text-amber-700 font-bold mt-3 hover:underline">
          Voir les {distributions.length} distributions
        </Link>
      )}
    </div>
  );
}
