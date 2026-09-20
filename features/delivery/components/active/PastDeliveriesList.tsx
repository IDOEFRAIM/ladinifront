'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, type DeliveryData } from '@/features/delivery/components/active/delivery-ui';

interface Props {
  deliveries: DeliveryData[];
}

export default function PastDeliveriesList({ deliveries: pastDeliveries }: Props) {
  return (
    <div>
      <h2 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-3 font-['Space_Grotesk']">
        Historique récent
      </h2>
      <div className="flex flex-col gap-2">
        {pastDeliveries.map((d) => (
          <Card key={d.id} className="p-3.5 flex justify-between items-center transition-shadow hover:shadow-sm">
            <div>
              <div className="text-sm font-bold text-[#064E3B]">
                {d.order?.customerName || 'Client'} · <span className="font-normal text-xs text-[#64748B]">{d.order?.city || '—'}</span>
              </div>
              <div className="text-xs font-semibold text-[#64748B] mt-0.5">
                {Number(d.order?.totalAmount || 0).toLocaleString()} CFA
              </div>
            </div>
            
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
              d.status === 'DELIVERED' 
                ? 'bg-emerald-50 text-[#10B981] border-emerald-100' 
                : 'bg-red-50 text-[#DC2626] border-red-100'
            }`}>
              {d.status === 'DELIVERED' ? (
                <>
                  <CheckCircle2 size={11} /> 
                  Livré
                </>
              ) : (
                <>
                  <XCircle size={11} /> 
                  Échoué
                </>
              )}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
