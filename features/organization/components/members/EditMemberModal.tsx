'use client';

import { Check } from 'lucide-react';
import { OrgModal, ModalFooter } from '@/features/organization/components/shared';
import { ORG_ROLES, type MemberItem, type RoleOption } from '@/features/organization/components/members/members.config';

interface Props {
  member: MemberItem;
  orgRole: string;
  onOrgRoleChange: (value: string) => void;
  roleDefId: string;
  onRoleDefChange: (value: string) => void;
  roles: RoleOption[];
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function EditMemberModal({ member, orgRole, onOrgRoleChange, roleDefId, onRoleDefChange, roles, saving, onConfirm, onClose }: Props) {
  return (
    <OrgModal title={`Modifier ${member.name}`} onClose={() => onClose()}>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
              Rôle organisationnel
            </label>
            <select
              value={orgRole}
              onChange={e => onOrgRoleChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {ORG_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
              Rôle personnalisé
            </label>
            <select
              value={roleDefId}
              onChange={e => onRoleDefChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">Aucun</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
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
