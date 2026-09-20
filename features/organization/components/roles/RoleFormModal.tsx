'use client';

import { Check } from 'lucide-react';
import { OrgModal, ModalFooter } from '@/features/organization/components/shared';
import { PERMISSION_GROUPS } from '@/features/organization/components/roles/roles.config';

interface Props {
  isEditing: boolean;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  permissions: Set<string>;
  onTogglePermission: (perm: string) => void;
  onToggleGroup: (perms: string[]) => void;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function RoleFormModal({
  isEditing, name, onNameChange, description, onDescriptionChange, permissions, onTogglePermission, onToggleGroup, saving, onConfirm, onClose,
}: Props) {
  return (
    <OrgModal
      title={isEditing ? 'Modifier le rôle' : 'Nouveau rôle'}
      onClose={onClose}
      maxWidth="max-w-2xl"
      scrollable
    >
      {/* Name */}
      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
          Nom du rôle *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          placeholder="Ex: Superviseur de Collecte"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          placeholder="Optionnel"
        />
      </div>

      {/* Permissions multi-select */}
      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-3">
          Permissions * ({permissions.size} sélectionnée{permissions.size > 1 ? 's' : ''})
        </label>

        <div className="space-y-4">
          {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
            const allSelected = perms.every(p => permissions.has(p));
            const someSelected = perms.some(p => permissions.has(p));
            return (
              <div key={group} className="border border-stone-200 rounded-xl p-3">
                <button
                  type="button"
                  onClick={() => onToggleGroup(perms)}
                  className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-2 hover:text-emerald-700 transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      allSelected
                        ? 'bg-emerald-600 border-emerald-600'
                        : someSelected
                        ? 'bg-emerald-200 border-emerald-400'
                        : 'border-stone-300'
                    }`}
                  >
                    {(allSelected || someSelected) && <Check size={10} className="text-white" />}
                  </div>
                  {group}
                </button>
                <div className="grid grid-cols-2 gap-1">
                  {perms.map(perm => (
                    <label
                      key={perm}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={permissions.has(perm)}
                        onChange={() => onTogglePermission(perm)}
                        className="accent-emerald-600 w-3.5 h-3.5"
                      />
                      <span className="text-xs text-stone-600 font-medium">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
  <ModalFooter
    onCancel={() => onClose()}
    onConfirm={onConfirm}
    confirmLabel={isEditing ? 'Mettre à jour' : 'Créer'}
    saving={saving}
    disabled={!name.trim() || permissions.size === 0}
    icon={<Check size={14} />}
  />
    </OrgModal>
  );
}
