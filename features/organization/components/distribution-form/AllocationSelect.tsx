'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import type { AllocOption } from '@/features/organization/components/distribution-form/distribution-form.types';

interface Props {
  allocations: AllocOption[];
  value: string;
  onChange: (id: string) => void;
}

export default function AllocationSelect({ allocations, value, onChange }: Props) {
  return (
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
        value={value}
        onChange={e => onChange(e.target.value)}
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
  );
}
