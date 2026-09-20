import React from 'react';

export function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
        active ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      {label}
    </button>
  );
}

export function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-emerald-900/5 p-10 text-center">
      <div className="text-slate-300 flex justify-center mb-3">{icon}</div>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

export function StatusBadge({ status, converted }: { status: string; converted: boolean }) {
  const label = converted ? 'Confirmée' : status === 'PREORDER' ? 'En attente' : status;
  const cls = converted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  return <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${cls}`}>{label}</span>;
}
