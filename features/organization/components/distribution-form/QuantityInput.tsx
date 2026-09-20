'use client';

import type { AllocOption } from '@/features/organization/components/distribution-form/distribution-form.types';

interface Props {
  quantity: number | '';
  onChange: (value: number | '') => void;
  selectedAllocation: AllocOption | undefined;
}

export default function QuantityInput({ quantity, onChange, selectedAllocation }: Props) {
  return (
  <div>
    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Quantité *</label>
    <input
      type="number"
      value={quantity}
      onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      min={1}
      max={selectedAllocation?.remainingQuantity || 999999}
      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
      placeholder={selectedAllocation ? `Max: ${selectedAllocation.remainingQuantity} ${selectedAllocation.unit}` : ''}
    />
    {selectedAllocation && quantity && Number(quantity) > selectedAllocation.remainingQuantity && (
      <div className="text-xs text-red-600 mt-1">Dépasse le stock restant ({selectedAllocation.remainingQuantity} {selectedAllocation.unit})</div>
    )}
  </div>
  );
}
