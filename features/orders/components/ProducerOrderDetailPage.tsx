"use client";

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaVolumeUp } from 'react-icons/fa';
import { canTransition, getTimelineSteps } from '@/lib/orderStateMachine';
import { StatusBadge } from '@/features/orders/components/StatusCard';
import { CustomerCard } from '@/features/orders/components/CustomerCard';
import { LOGISTICS_STEPS } from '@/features/orders/components/order-detail/logistics.config';
import { useProducerOrder } from '@/features/orders/components/order-detail/useProducerOrder';
import { LoadingScreen, ErrorScreen } from '@/features/orders/components/order-detail/OrderDetailScreens';
import OrderTimeline from '@/features/orders/components/order-detail/OrderTimeline';
import OrderPaymentCard from '@/features/orders/components/order-detail/OrderPaymentCard';
import OrderInvoiceCard from '@/features/orders/components/order-detail/OrderInvoiceCard';
import OrderActions from '@/features/orders/components/order-detail/OrderActions';

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const { order, status, isUpdating, updateStatus } = useProducerOrder(orderId);

  // ── BARRIÈRE DE SÉCURITÉ CRUCIALE : ON S'ARRÊTE SI L'OBJET ORDER EST NULL ──
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error' || !order) return <ErrorScreen onBack={() => router.push('/sales')} />;

  // ── TOUS LES CALCULS EN DESSOUS SONT DÉSORMAIS SÉCURISÉS ET SANS RISQUE DE CRASH ──
  const orderStatusForFlow = String(order.status || 'PENDING').toUpperCase() === 'PAID' ? 'PROCESSING' : String(order.status || 'PENDING').toUpperCase();

  const step = LOGISTICS_STEPS[orderStatusForFlow] || LOGISTICS_STEPS.PENDING;
  const isFinalStatus = orderStatusForFlow === 'DELIVERED' || orderStatusForFlow === 'CANCELLED';

  const nextTargetStatus = step.next;
  const transitionAllowed = !nextTargetStatus ? false : canTransition(orderStatusForFlow, nextTargetStatus);

  const timelineSteps = getTimelineSteps(orderStatusForFlow, String(order.deliveryStatus || 'PENDING'));

  // Calcul défensif renforcé pour le sous-total du panier
  const subTotal = order.items?.reduce((acc: number, item: any) => {
    const price = Number(item.priceAtSale ?? item.price ?? 0);
    const quantity = Number(item.quantity ?? item.qty ?? 0);
    return acc + (price * quantity);
  }, 0) || 0;

  const deliveryFee = Number(order.deliveryFee || 0);
  const totalAmount = subTotal + deliveryFee;

  return (
    <div className="min-h-screen bg-[#F7F5EE] pb-24 font-sans animate-in fade-in duration-500">
      
      {/* HEADER NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-[#F7F5EE]/80 backdrop-blur-xl border-b border-[#E0E0D1] p-6 flex justify-between items-center">
        <button 
          type="button"
          onClick={() => router.back()}
          className="w-12 h-12 bg-white rounded-2xl border border-[#E0E0D1] flex items-center justify-center shadow-sm active:scale-90 transition-transform text-[#5B4636]"
        >
          <FaArrowLeft size={14} />
        </button>
        <StatusBadge status={order.status} />
      </nav>

      <div className="p-6 max-w-xl mx-auto space-y-6">
        
        {/* TITRE PRINCIPAL */}
        <header className="space-y-2">
          <p className="text-[10px] font-black text-[#A4A291] uppercase tracking-[0.3em]">
            RÉFÉRENCE : {String(order.id || orderId).slice(-12).toUpperCase()}
          </p>
          <h1 className="text-4xl font-black text-[#5B4636] tracking-tighter uppercase leading-none">
            Fiche Commande
          </h1>
          <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-[#E0E0D1] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-[#5B4636] uppercase italic">
              {order.displayDate}
            </span>
          </div>
        </header>

        <OrderTimeline timelineSteps={timelineSteps} />

        {/* LECTEUR VOCAL DE LIVRAISON */}
        {order.audioUrl && (
          <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200/60 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-800 text-[10px] font-black uppercase tracking-wider">
              <FaVolumeUp size={14} className="text-amber-600" />
              Note vocale de l'acheteur
            </div>
            <audio src={order.audioUrl} controls className="w-full h-8 accent-amber-700" />
          </div>
        )}

        {/* CARTE CLIENT */}
        <div className="space-y-4">
          <CustomerCard 
            name={order.customerName || 'Client anonyme'} 
            location={order.city || order.location || 'Lieu non précisé'} 
            phone={order.customerPhone || ''} 
          />

          {/* RÈGLEMENT ET LOGISTIQUE */}

          <OrderPaymentCard order={order} />

          <OrderInvoiceCard items={order.items || []} deliveryFee={deliveryFee} subTotal={subTotal} totalAmount={totalAmount} />
        </div>

        <OrderActions
          step={step}
          nextTargetStatus={nextTargetStatus}
          transitionAllowed={transitionAllowed}
          isUpdating={isUpdating}
          orderStatusForFlow={orderStatusForFlow}
          onUpdate={updateStatus}
        />

      </div>
    </div>
  );
}
