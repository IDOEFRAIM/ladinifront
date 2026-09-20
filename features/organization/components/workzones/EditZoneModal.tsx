'use client';

import { Check } from 'lucide-react';
import { OrgModal, ModalFooter } from '@/features/organization/components/shared';
import type { WorkZoneItem, MemberOption } from '@/features/organization/components/workzones/work-zones.types';

interface Props {
  workZone: WorkZoneItem;
  members: MemberOption[];
  managerId: string;
  onManagerChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function EditZoneModal({ workZone, members, managerId, onManagerChange, role, onRoleChange, saving, onConfirm, onClose }: Props) {
  return (
    <OrgModal title={`Modifier « ${workZone.zoneName} »`} onClose={onClose}>
      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Manager</label>
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

      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
          Étiquette de rôle
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
    confirmLabel="Enregistrer"
    saving={saving}
    icon={<Check size={14} />}
  />
</OrgModal>
  );
}
