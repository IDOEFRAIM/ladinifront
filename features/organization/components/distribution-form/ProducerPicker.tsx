'use client';

import { Search, User } from 'lucide-react';
import type { ProducerOption } from '@/features/organization/components/distribution-form/distribution-form.types';

interface Props {
  producerSearch: string;
  onSearchInput: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  /** Résultats à afficher (null = liste masquée). */
  results: ProducerOption[] | null;
  onSelect: (producer: ProducerOption) => void;
  selectedProducer: ProducerOption | undefined;
  onClear: () => void;
}

export default function ProducerPicker({ producerSearch, onSearchInput, onFocus, onBlur, results, onSelect, selectedProducer, onClear }: Props) {
  return (
  <div>
    <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
      <User size={14} /> Producteur *
    </label>
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        type="text"
        value={producerSearch}
        onChange={e => onSearchInput(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Rechercher par nom, email ou zone..."
        className="w-full pl-9 pr-4 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 outline-none"
      />
    </div>
    {/* Results */}
    {results && (
      <div className="mt-1 max-h-48 overflow-y-auto border border-stone-200 rounded-lg bg-white shadow-sm">
        {results.length === 0 ? (
          <div className="px-4 py-3 text-sm text-stone-400">Aucun producteur trouvé.</div>
        ) : results.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
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
        <button type="button" onClick={onClear} className="ml-2 text-emerald-500 hover:text-emerald-700 text-xs underline">Changer</button>
      </div>
    )}
  </div>
  );
}
