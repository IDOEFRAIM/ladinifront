'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  timelineSteps: any[];
}

export default function OrderTimeline({ timelineSteps }: Props) {
  return (
  <div className="bg-white rounded-[2rem] p-6 border border-[#E0E0D1] shadow-sm">
    <h3 className="text-[10px] font-black text-[#A4A291] uppercase tracking-wider mb-4">
      État d'avancement
    </h3>
    <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
      {timelineSteps.map((s: any, idx: number) => (
        <div key={s.id || s.key || idx} className="flex flex-col items-center flex-1 min-w-[65px]">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            s.active ? 'bg-[#497A3A] text-white shadow-md' : 'bg-stone-100 text-stone-400'
          }`}>
            {idx + 1}
          </div>
          <span className={`text-[8px] font-black uppercase tracking-tighter mt-2 text-center leading-none ${s.active ? 'text-[#497A3A]' : 'text-stone-400'}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  </div>
  );
}
