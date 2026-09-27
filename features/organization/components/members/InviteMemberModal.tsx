'use client';

import { Plus } from 'lucide-react';
import { OrgModal, ModalFooter } from '@/features/organization/components/shared';
import { ORG_ROLES, type RoleOption, type ProducerOption } from '@/features/organization/components/members/members.config';

interface Props {
  type: 'producer' | 'other';
  onTypeChange: (value: 'producer' | 'other') => void;
  id: string;
  onIdChange: (value: string) => void;
  producerOptions: ProducerOption[];
  orgRole: string;
  onOrgRoleChange: (value: string) => void;
  roleDefId: string;
  onRoleDefChange: (value: string) => void;
  roles: RoleOption[];
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function InviteMemberModal({
  type, onTypeChange, id, onIdChange, producerOptions, orgRole, onOrgRoleChange, roleDefId, onRoleDefChange, roles, saving, onConfirm, onClose,
}: Props) {
  return (
    <OrgModal title="Inviter un membre" onClose={() => onClose()}>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Type de membre</label>
            <select
              value={type}
              onChange={e => onTypeChange(e.target.value as 'producer' | 'other')}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="producer">Producteur</option>
              <option value="other">Livreur / Autre (email ou téléphone)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
              {type === 'producer' ? 'Sélectionner un producteur à inviter *' : 'Email ou téléphone du membre à inviter *'}
            </label>
            {type === 'producer' ? (
              <select
                value={id}
                onChange={e => onIdChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">Choisir un producteur...</option>
                {producerOptions.map(p => (
                  <option key={p.id} value={p.email || p.phone}>{p.businessName} — {p.email || p.phone}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={id}
                onChange={e => onIdChange(e.target.value)}
                placeholder="email ou téléphone du livreur"
                className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
              Rôle organisationnel *
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
              Rôle personnalisé (optionnel)
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
        confirmLabel="Inviter"
        saving={saving}
        disabled={!id.trim()}
        icon={<Plus size={14} />}
      />
    </OrgModal>
  );
}
