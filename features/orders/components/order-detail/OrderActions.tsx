'use client';

import { FaSpinner, FaFilePdf } from 'react-icons/fa';
import type { LogisticsStep } from '@/features/orders/components/order-detail/logistics.config';

interface Props {
  step: LogisticsStep;
  nextTargetStatus: string;
  transitionAllowed: boolean;
  isUpdating: boolean;
  orderStatusForFlow: string;
  onUpdate: (status: string) => void;
}

export default function OrderActions({ step, nextTargetStatus, transitionAllowed, isUpdating, orderStatusForFlow, onUpdate }: Props) {
  const StepIcon = step.icon;
  return (
    <footer className="space-y-4 pt-4">
      {nextTargetStatus && transitionAllowed ? (
        <button
          type="button"
          onClick={() => onUpdate(nextTargetStatus)}
          disabled={isUpdating}
          className={`w-full py-6 rounded-[2.2rem] flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${step.theme} text-white hover:brightness-110 shadow-xl`}
        >
          {isUpdating ? (
            <FaSpinner className="animate-spin text-lg" />
          ) : (
            <>
              <StepIcon size={18} className="opacity-90" />
              {step.label}
            </>
          )}
        </button>
      ) : (
        <div className="w-full py-5 bg-[#E0E0D1] text-[#A4A291] rounded-[2.2rem] text-center text-[10px] font-black uppercase tracking-wider border border-[#D1D1C2]">
          {orderStatusForFlow === 'DELIVERED' ? '✓ Flux terminé et livré' : 'Aucune action requise'}
        </div>
      )}

      <button 
        type="button"
        className="w-full flex items-center justify-center gap-2 py-3 text-[#A4A291] font-black text-[9px] uppercase tracking-[0.2em] hover:text-[#5B4636] transition-colors group"
      >
        <FaFilePdf size={13} className="group-hover:scale-110 transition-transform" />
        Générer le bordereau PDF
      </button>
    </footer>
  );
}
