'use client';

import { Check } from 'lucide-react';
import { OrgModal, ModalFooter } from '@/features/organization/components/shared';
import { UNITS, type ZoneOption } from '@/features/organization/components/allocations/allocations.config';

interface Props {
  mode: 'create' | 'edit';
  seedType: string;
  onSeedTypeChange: (value: string) => void;
  quantity: number | '';
  onQuantityChange: (value: number | '') => void;
  unit: string;
  onUnitChange: (value: string) => void;
  zoneId: string;
  onZoneChange: (value: string) => void;
  zones: ZoneOption[];
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Formulaire de création (mode « create ») et de modification (mode « edit ») d'une allocation ; seuls les libellés diffèrent. */
export default function AllocationFormModal({
  mode, seedType, onSeedTypeChange, quantity, onQuantityChange, unit, onUnitChange, zoneId, onZoneChange, zones, saving, onConfirm, onClose,
}: Props) {
  const isCreate = mode === 'create';
  return (
    <OrgModal title={isCreate ? 'Nouvelle allocation' : "Modifier l'allocation"} onClose={onClose}>
      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">{isCreate ? 'Type de semence *' : 'Type de semence'}</label>
        <input type="text" value={seedType} onChange={e => onSeedTypeChange(e.target.value)} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder={isCreate ? "Ex: Maïs, Sorgho..." : undefined} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">{isCreate ? 'Quantité *' : 'Quantité totale'}</label>
          <input type="number" value={quantity} onChange={e => onQuantityChange(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none" min={1} />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Unité</label>
          <select value={unit} onChange={e => onUnitChange(e.target.value)} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">{isCreate ? 'Zone *' : 'Zone'}</label>
        <select value={zoneId} onChange={e => onZoneChange(e.target.value)} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none">
          <option value="">Choisir une zone...</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name} ({z.code})</option>)}
        </select>
      </div>
      <ModalFooter
        onCancel={onClose}
        onConfirm={onConfirm}
        confirmLabel={isCreate ? 'Créer' : 'Enregistrer'}
        saving={saving}
        disabled={isCreate ? !seedType.trim() || !quantity || !zoneId : undefined}
        icon={<Check size={14} />}
      />
    </OrgModal>
  );
}
