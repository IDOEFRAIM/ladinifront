'use client';

import { Shield, Pencil, Trash2, Users } from 'lucide-react';
import type { RoleItem } from '@/features/organization/components/roles/roles.config';

interface Props {
  roles: RoleItem[];
  onCreate: () => void;
  onEdit: (role: RoleItem) => void;
  onDelete: (roleId: string) => void;
}

export default function RolesList({ roles, onCreate, onEdit, onDelete }: Props) {
  if (roles.length === 0) {
    return (
    <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
      <Shield size={40} className="mx-auto text-stone-300 mb-3" />
      <p className="text-stone-500 text-sm">Aucun rôle personnalisé défini.</p>
      <button onClick={onCreate} className="mt-3 text-emerald-700 text-sm font-bold hover:underline">
        Créer le premier rôle
      </button>
    </div>
    );
  }

  return (
    <div className="space-y-3">
      {roles.map(role => (
        <div key={role.id} className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-stone-900">{role.name}</h3>
              {role.description && (
                <p className="text-sm text-stone-500 mt-0.5">{role.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 text-xs font-bold px-2.5 py-1 rounded-md">
                <Users size={12} /> {role.membersCount}
              </span>
              <button
                onClick={() => onEdit(role)}
                className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors"
                title="Modifier"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => onDelete(role.id)}
                className="p-2 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                title="Supprimer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {role.permissions.map(p => (
              <span key={p} className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded">
                {p}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
