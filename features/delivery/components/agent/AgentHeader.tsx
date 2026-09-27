'use client';

import { Loader2, Power, PowerOff } from 'lucide-react';

interface Props {
  isOnline: boolean;
  toggling: boolean;
  onToggle: () => void;
}

export default function AgentHeader({ isOnline, toggling, onToggle }: Props) {
  return (
  <div className="flex justify-between items-center mb-8 pt-5">
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-[#064E3B] m-0 font-['Space_Grotesk']">
        Missions
      </h1>
      <div className="flex items-center gap-1.5 mt-1">
        <div 
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isOnline ? 'bg-[#10B981] shadow-[0_0_10px_#10B981]' : 'bg-[#DC2626]'
          }`} 
        />
        <span className="text-xs text-[#64748B] font-semibold">
          {isOnline ? 'Disponible pour livrer' : 'Mode pause'}
        </span>
      </div>
    </div>

    {/* Bouton Switch iOS Style */}
    <button 
      onClick={onToggle} 
      disabled={toggling}
      aria-label={isOnline ? "Passer hors ligne" : "Passer en ligne"}
      className={`relative w-[100px] h-11 rounded-full border-none cursor-pointer p-1 transition-all duration-300 flex items-center ${
        isOnline ? 'bg-[#064E3B]' : 'bg-[#E5E7EB]'
      } ${toggling ? 'opacity-80 cursor-not-allowed' : ''}`}
    >
      <div 
        className={`w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-300 ${
          isOnline ? 'translate-x-[56px]' : 'translate-x-0'
        }`}
      >
        {toggling ? (
          <Loader2 size={18} className="animate-spin text-[#64748B]" />
        ) : isOnline ? (
          <Power size={18} className="text-[#10B981]" strokeWidth={3} />
        ) : (
          <PowerOff size={18} className="text-[#64748B]" strokeWidth={3} />
        )}
      </div>
    </button>
  </div>
  );
}
