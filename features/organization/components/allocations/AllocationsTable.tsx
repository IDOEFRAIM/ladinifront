'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Pagination } from '@/features/organization/components/shared';
import type { AllocationItem } from '@/features/organization/components/allocations/allocations.config';

interface Props {
  allocations: AllocationItem[];
  search: string;
  page: number;
  totalPages: number;
  count: number;
  onPageChange: (page: number) => void;
  onEdit: (allocation: AllocationItem) => void;
  onDelete: (id: string, seedType: string) => void;
}

  function usagePercent(a: AllocationItem) {
    if (!a.totalQuantity) return 0;
    return Math.round(((a.totalQuantity - a.remainingQuantity) / a.totalQuantity) * 100);
  }

export default function AllocationsTable({ allocations: paginated, search, page, totalPages, count, onPageChange, onEdit, onDelete }: Props) {
  return (
  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200">
            <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Semence</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Total</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Restant</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Usage</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Zone</th>
            <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Date</th>
            <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-12 text-center text-stone-400">
              {search ? 'Aucun résultat.' : 'Aucune allocation. Créez-en une.'}
            </td></tr>
          ) : paginated.map(a => {
            const pct = usagePercent(a);
            return (
              <tr key={a.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-stone-900">{a.seedType}</div>
                  <div className="text-xs text-stone-400">{a.unit}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-stone-700">{a.totalQuantity.toLocaleString('fr-FR')}</td>
                <td className="px-4 py-3 text-right font-mono text-stone-700">{a.remainingQuantity.toLocaleString('fr-FR')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 80 ? '#DC2626' : pct > 50 ? '#D97706' : '#059669' }} />
                    </div>
                    <span className="text-xs text-stone-500">{pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-600">{a.zone?.name ?? <span className="text-stone-300">—</span>}</td>
                <td className="px-4 py-3 text-stone-500 text-xs">{new Date(a.createdAt).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(a)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors" title="Modifier"><Pencil size={14} /></button>
                    <button onClick={() => onDelete(a.id, a.seedType)} className="p-2 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors" title="Supprimer"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <Pagination page={page} totalPages={totalPages} count={count} onPageChange={onPageChange} />
  </div>
  );
}
