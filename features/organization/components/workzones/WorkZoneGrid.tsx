'use client';

import { MapPin, Pencil, Trash2, User } from 'lucide-react';
import type { WorkZoneItem } from '@/features/organization/components/workzones/work-zones.types';

interface Props {
  workZones: WorkZoneItem[];
  onAssign: () => void;
  onEdit: (wz: WorkZoneItem) => void;
  onRemove: (id: string, name: string) => void;
}

export default function WorkZoneGrid({ workZones, onAssign, onEdit, onRemove }: Props) {
  if (workZones.length === 0) {
    return (
  <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
    <MapPin size={40} className="mx-auto text-stone-300 mb-3" />
    <p className="text-stone-500 text-sm">Aucune zone de travail assignée.</p>
    <button onClick={onAssign} className="mt-3 text-emerald-700 text-sm font-bold hover:underline">
      Assigner la première zone
    </button>
  </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workZones.map(wz => (
        <div key={wz.id} className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-stone-900">{wz.zoneName}</h3>
              <p className="text-xs text-stone-400 font-mono">{wz.zoneCode}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(wz)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors"
                title="Modifier"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onRemove(wz.id, wz.zoneName)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                title="Retirer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {wz.zonePath && (
            <p className="text-xs text-stone-400 mb-2 truncate" title={wz.zonePath}>
              {wz.zonePath}
            </p>
          )}

          <div className="mt-auto pt-3 border-t border-stone-100">
            {wz.manager ? (
              <div className="flex items-center gap-2">
                <User size={14} className="text-emerald-600" />
                <span className="text-sm font-medium text-stone-700">{wz.manager.name || wz.manager.email}</span>
                {wz.role && (
                  <span className="ml-auto text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded">
                    {wz.role}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-stone-300 text-sm">
                <User size={14} /> Aucun manager assigné
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
