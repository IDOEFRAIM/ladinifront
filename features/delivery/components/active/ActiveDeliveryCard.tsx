'use client';

import { Truck, Package, MapPin, Loader2, XCircle, KeyRound, ShieldCheck } from 'lucide-react';
import { Card, type DeliveryData } from '@/features/delivery/components/active/delivery-ui';

interface Props {
  delivery: DeliveryData;
  actionLoading: string | null;
  otpValue: string;
  onOtpChange: (deliveryId: string, value: string) => void;
  onAction: (action: 'PICKUP' | 'CONFIRM' | 'FAILED', deliveryId: string, extra?: Record<string, string>) => void;
}

export default function ActiveDeliveryCard({ delivery: d, actionLoading, otpValue, onOtpChange, onAction }: Props) {
  const currentId = d.id;
  const orderRef = d.order?.id?.substring(0, 8) || d.orderId?.substring(0, 8) || '';
  const isPickupLoading = actionLoading === `${currentId}-PICKUP`;
  const isConfirmLoading = actionLoading === `${currentId}-CONFIRM`;
  const isFailedLoading = actionLoading === `${currentId}-FAILED`;


  return (
  <Card className="border-2 border-[#10B981]/10">
    <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
      <div>
        <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5 font-mono">
          #{orderRef.toUpperCase()}
        </div>
        <div className="text-base font-bold text-[#064E3B] font-['Space_Grotesk']">
          {d.order?.customerName || 'Client AgriMarket'}
        </div>
        <div className="flex items-center gap-1 text-xs text-[#64748B] mt-0.5">
          <MapPin size={12} className="text-[#64748B]/70" /> 
          {d.order?.city || 'Adresse renseignée'}
        </div>
      </div>
      
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${
        d.status === 'ASSIGNED' 
          ? 'bg-blue-50 text-blue-600 border border-blue-100' 
          : 'bg-cyan-50 text-cyan-600 border border-cyan-100'
      }`}>
        {d.status === 'ASSIGNED' ? (
          <>
            <Package size={12} /> 
            À ramasser
          </>
        ) : (
          <>
            <Truck size={12} /> 
            En route
          </>
        )}
      </span>
    </div>

    {/* Actions de livraison */}
    <div className="flex flex-col gap-2.5 pt-3 border-t border-[rgba(6,78,59,0.07)]">
      
      {/* ÉTAPE 1 : Confirmer le ramassage chez le producteur */}
      {d.status === 'ASSIGNED' && (
        <button
          onClick={() => onAction('PICKUP', currentId)}
          disabled={actionLoading !== null}
          className="w-full py-3 rounded-xl border-none bg-blue-600 text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {isPickupLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Package size={16} /> 
              Confirmer le ramassage
            </>
          )}
        </button>
      )}

      {/* ÉTAPE 2 : Livraison en route -> Clôture par OTP sécurisé */}
      {d.status === 'IN_TRANSIT' && (
        <div className="flex flex-col gap-2">
          <div className="relative w-full">
            <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] opacity-50" />
            <input
              type="text"
              placeholder="Code OTP du client"
              maxLength={6}
              value={otpValue}
              disabled={actionLoading !== null}
              onChange={(e) => onOtpChange(currentId, e.target.value.replace(/\D/g, ''))}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[rgba(6,78,59,0.07)] bg-white font-mono text-center text-lg font-bold text-[#064E3B] tracking-[0.4em] box-border focus:outline-none focus:border-[#10B981] disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => onAction('CONFIRM', currentId, { otpCode: otpValue })}
              disabled={actionLoading !== null || otpValue.length < 6}
              className="flex-1 py-3 rounded-xl border-none bg-[#10B981] text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-[#0eab76]"
            >
              {isConfirmLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={16} /> 
                  Confirmer la livraison
                </>
              )}
            </button>
            
            <button
              onClick={() => { if (confirm('Signaler un échec définitif de livraison ?')) onAction('FAILED', currentId); }}
              disabled={actionLoading !== null}
              className="px-4 py-3 rounded-xl border border-red-200 bg-red-50/50 text-[#DC2626] font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {isFailedLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <XCircle size={14} /> 
                  Échec
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  </Card>
  );
}
