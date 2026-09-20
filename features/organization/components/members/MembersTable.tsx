'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Pagination } from '@/features/organization/components/shared';
import { ORG_ROLES, type MemberItem } from '@/features/organization/components/members/members.config';

interface Props {
  members: MemberItem[];
  search: string;
  page: number;
  totalPages: number;
  count: number;
  onPageChange: (page: number) => void;
  onEdit: (member: MemberItem) => void;
  onRemove: (membershipId: string, name: string) => void;
}

function orgRoleLabel(role: string): string {
  return ORG_ROLES.find(r => r.value === role)?.label || role;
}

export default function MembersTable({ members: paginated, search, page, totalPages, count, onPageChange, onEdit, onRemove }: Props) {
  return (
  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200">
            <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Membre</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Contact</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Rôle Org</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Rôle Custom</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Zone</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-stone-400">
                {search ? 'Aucun résultat pour cette recherche.' : 'Aucun membre.'}
              </td>
            </tr>
          ) : (
            paginated.map(m => (
              <tr key={m.membershipId} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-stone-900">{m.name}</div>
                  <div className="text-xs text-stone-400">{m.systemRole}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-stone-700">{m.email}</div>
                  <div className="text-xs text-stone-400">{m.phone}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md ${
                    m.orgRole === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {orgRoleLabel(m.orgRole)}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {m.roleDef ? m.roleDef.name : <span className="text-stone-300">—</span>}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {m.managedZone ? m.managedZone.name : <span className="text-stone-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(m)}
                      className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors"
                      title="Modifier"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onRemove(m.membershipId, m.name)}
                      className="p-2 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                      title="Retirer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    <Pagination page={page} totalPages={totalPages} count={count} onPageChange={onPageChange} />
  </div>
  );
}
