'use client';

import { Search, Check } from 'lucide-react';
import { OrgModal, ModalFooter } from '@/features/organization/components/shared';
import type { ZoneOption, MemberOption } from '@/features/organization/components/workzones/work-zones.types';

interface Props {
  zoneSearch: string;
  onZoneSearchChange: (value: string) => void;
  filteredZones: ZoneOption[];
  assignedZoneIds: Set<string>;
  zoneId: string;
  onZoneSelect: (id: string) => void;
  members: MemberOption[];
  managerId: string;
  onManagerChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function AssignZoneModal({
  zoneSearch, onZoneSearchChange, filteredZones, assignedZoneIds, zoneId, onZoneSelect, members, managerId, onManagerChange, role, onRoleChange, saving, onConfirm, onClose,
}: Props) {
  return (
    <OrgModal title="Assigner une zone" onClose={onClose} scrollable>
      {/* Zone combobox */}
      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
          Zone *
        </label>
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={zoneSearch}
            onChange={e => onZoneSearchChange(e.target.value)}
            placeholder="Rechercher une zone…"
            className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div className="max-h-40 overflow-y-auto border border-stone-200 rounded-lg">
          {filteredZones.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-stone-400">Aucune zone trouvée</div>
          ) : (
            filteredZones.map(z => {
              const isAssigned = assignedZoneIds.has(z.id);
              const isSelected = zoneId === z.id;
              return (
                <button
                  key={z.id}
                  type="button"
                  disabled={isAssigned}
                  onClick={() => onZoneSelect(z.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm border-b border-stone-50 last:border-0 transition-colors ${
                    isSelected ? 'bg-emerald-50 text-emerald-800' :
                    isAssigned ? 'bg-stone-50 text-stone-300 cursor-not-allowed' :
                    'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div>
                    <span className="font-medium">{z.name}</span>
                    <span className="ml-2 text-xs text-stone-400 font-mono">{z.code}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-emerald-600" />}
                  {isAssigned && <span className="text-xs text-stone-400">Déjà assignée</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Manager select */}
      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
          Manager (optionnel)
        </label>
        <select
          value={managerId}
          onChange={e => onManagerChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="">Aucun</option>
          {members.map(m => (
            <option key={m.userId} value={m.userId}>{m.name} ({m.email})</option>
          ))}
        </select>
      </div>

      {/* Role label */}
      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
          Étiquette de rôle (optionnel)
        </label>
        <input
          type="text"
          value={role}
          onChange={e => onRoleChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="Ex: Superviseur de collecte"
        />
      </div>
  <ModalFooter
    onCancel={() => onClose()}
    onConfirm={onConfirm}
    confirmLabel="Assigner"
    saving={saving}
    disabled={!zoneId}
    icon={<Check size={14} />}
  />
    </OrgModal>
  );
}
