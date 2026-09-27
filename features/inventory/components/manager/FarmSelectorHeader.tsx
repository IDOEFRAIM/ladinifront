'use client';

import { FaWarehouse, FaPlus } from 'react-icons/fa';
import type { Farm } from '@/features/inventory/components/manager/inventory-manager.types';

interface Props {
  farms: Farm[];
  selectedFarmId: string | null;
  onSelectFarm: (id: string) => void;
  onToggleAddFarm: () => void;
  onNewStock: () => void;
}

export default function FarmSelectorHeader({ farms, selectedFarmId, onSelectFarm, onToggleAddFarm, onNewStock }: Props) {
  return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                    <FaWarehouse size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase italic">Mes Fermes</h2>
                    <div className="flex gap-2 mt-1">
                        {farms.map(farm => (
                            <button
                                key={farm.id}
                                onClick={() => onSelectFarm(farm.id)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                                    selectedFarmId === farm.id 
                                    ? 'bg-slate-900 text-white shadow-lg' 
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                }`}
                            >
                                {farm.name}
                            </button>
                        ))}
                        <button 
                            onClick={() => onToggleAddFarm()}
                            className="px-3 py-1 rounded-lg text-xs font-bold uppercase bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 border-dashed"
                        >
                            + Nouvelle
                        </button>
                    </div>
                </div>
            </div>
            
            {selectedFarmId && (
                <button 
                    onClick={() => onNewStock()}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-green-200"
                >
                    <FaPlus size={12} />
                    <span className="text-xs font-black uppercase tracking-wider">Nouveau Stock</span>
                </button>
            )}
        </div>
  );
}
