'use client';

import Link from 'next/link';
import { Truck, ChevronRight } from 'lucide-react';

interface Props {
  count: number;
}

export default function ActiveMissionBanner({ count }: Props) {
  return (
  <Link href="/agent/deliveries/active" className="no-underline block mb-6 group">
    <div className="bg-gradient-to-r from-[#064E3B] to-[#10B981] rounded-[24px] p-5 color-white flex items-center justify-between shadow-[0_12px_24px_rgba(6,78,59,0.15)] transition-transform duration-200 active:scale-[0.99]">
      <div className="flex items-center gap-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
          <Truck size={24} />
        </div>
        <div>
          <div className="text-base font-extrabold">En cours</div>
          <div className="text-xs text-white/90">{count} mission{count > 1 ? 's' : ''} à terminer</div>
        </div>
      </div>
      <ChevronRight size={24} className="text-white transition-transform group-hover:translate-x-1" />
    </div>
  </Link>
  );
}
