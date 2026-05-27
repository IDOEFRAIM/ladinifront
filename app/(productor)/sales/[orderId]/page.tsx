"use client";

import React, { use, useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  FaArrowLeft, 
  FaSpinner, 
  FaSearch, 
  FaFilePdf, 
  FaClock, 
  FaTruck, 
  FaCheckCircle,
  FaMoneyBillWave,
  FaVolumeUp,
  FaReceipt,
  FaBoxOpen
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { canTransition, getTimelineSteps } from '@/lib/orderStateMachine';

import { StatusBadge } from '@/components/orders/statusCard';
import { CustomerCard } from '@/components/orders/customerCard';
import { OrderSummary } from '@/components/orders/orderSummary';

interface LogisticsStep {
  label: string;
  next: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  theme: string;
}

const LOGISTICS_STEPS: Record<string, LogisticsStep> = {
  PENDING: { label: 'Confirmer la commande', next: 'CONFIRMED', icon: FaClock, theme: 'bg-[#5B4636]' },
  CONFIRMED: { label: 'Marquer en préparation', next: 'PROCESSING', icon: FaBoxOpen, theme: 'bg-[#5B4636]' },
  PROCESSING: { label: 'Mettre en livraison', next: 'SHIPPED', icon: FaTruck, theme: 'bg-[#497A3A]' },
  SHIPPED: { label: 'Marquer comme livré', next: 'DELIVERED', icon: FaCheckCircle, theme: 'bg-green-600' },
  DELIVERED: { label: 'Commande Terminée', next: '', icon: FaCheckCircle, theme: 'bg-[#A4A291]' },
  CANCELLED: { label: 'Commande Annulée', next: '', icon: FaSearch, theme: 'bg-red-500' }
};

function useOrder(orderId: string) {
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setStatus('loading');
      const { data } = await axios.get(`/api/orders/${orderId}`);
      
      const normalizedStatus = String(data.status || 'PENDING').toUpperCase();
      const normalizedDeliveryStatus = String(data.deliveryStatus || 'PENDING').toUpperCase();
      
      const displayDate = data.createdAt || data.date
        ? new Date(data.createdAt || data.date).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
          })
        : 'Date inconnue';
      
      setOrder({
        ...data,
        status: normalizedStatus,
        deliveryStatus: normalizedDeliveryStatus,
        displayDate
      });
      setStatus('ready');
    } catch (err) {
      console.error("Fetch Error:", err);
      setStatus('error');
    }
  }, [orderId]);

  const updateStatus = async (nextStatus: string) => {
    if (!nextStatus) return;
    setIsUpdating(true);
    try {
      const { data } = await axios.patch(`/api/orders/${orderId}`, { status: nextStatus.toUpperCase() });
      toast.success("Mise à jour logistique enregistrée !");

      const normalizedStatus = String(data.status || nextStatus).toUpperCase();
      const normalizedDeliveryStatus = String(data.deliveryStatus || 'PENDING').toUpperCase();
      const displayDate = data.createdAt || data.date
        ? new Date(data.createdAt || data.date).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
          })
        : 'Date inconnue';

      setOrder((prevOrder: any) => ({
        ...(prevOrder || {}),
        ...data,
        status: normalizedStatus,
        deliveryStatus: normalizedDeliveryStatus,
        displayDate,
      }));
    } catch (err) {
      console.error("Update Error:", err);
      toast.error("Erreur lors de la modification du statut.");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, status, isUpdating, updateStatus };
}

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const { order, status, isUpdating, updateStatus } = useOrder(orderId);

  // ── BARRIÈRE DE SÉCURITÉ CRUCIALE : ON S'ARRÊTE SI L'OBJET ORDER EST NULL ──
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error' || !order) return <ErrorScreen onBack={() => router.push('/sales')} />;

  // ── TOUS LES CALCULS EN DESSOUS SONT DÉSORMAIS SÉCURISÉS ET SANS RISQUE DE CRASH ──
  const orderStatusForFlow = String(order.status || 'PENDING').toUpperCase() === 'PAID' ? 'PROCESSING' : String(order.status || 'PENDING').toUpperCase();

  const step = LOGISTICS_STEPS[orderStatusForFlow] || LOGISTICS_STEPS.PENDING;
  const isFinalStatus = orderStatusForFlow === 'DELIVERED' || orderStatusForFlow === 'CANCELLED';
  const StepIcon = step.icon;

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

        {/* TIMELINE INTERACTIVE HARMONISÉE — FIX NUMÉROTATION EN SÉQUENCE (1 à 6) */}
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
          <div className="bg-white rounded-[2rem] p-6 border border-[#E0E0D1] shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-[#A4A291] uppercase tracking-wider flex items-center gap-2">
              <FaMoneyBillWave className="text-[#497A3A]" /> Règlement & Expédition
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="block text-[9px] text-[#A4A291] uppercase font-bold">Méthode</span>
                <span className="font-black text-[#5B4636]">{order.paymentMethod || 'CASH À LA LIVRAISON'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="block text-[9px] text-[#A4A291] uppercase font-bold">Statut Paiement</span>
                <span className={`font-black uppercase text-[10px] ${order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>
                  {order.paymentStatus === 'PAID' ? 'Payé' : 'En attente'}
                </span>
              </div>
            </div>
            {order.deliveryDesc && (
              <div className="p-4 bg-stone-50 rounded-2xl text-xs text-[#5B4636] italic border border-stone-150">
                <span className="block text-[9px] font-black text-[#A4A291] uppercase tracking-wide not-italic mb-1">Directives de livraison :</span>
                "{order.deliveryDesc}"
              </div>
            )}
          </div>

          {/* RÉCAPITULATIF DE LA FACTURE */}
          <div className="bg-white rounded-[2rem] p-6 border border-[#E0E0D1] shadow-sm space-y-4">
            <h3 className="text-[10px] font-black text-[#A4A291] uppercase tracking-wider flex items-center gap-2">
              <FaReceipt className="text-stone-500" /> Facturation Articles
            </h3>
            
            <OrderSummary items={order.items || []} deliveryFee={deliveryFee} />

            <div className="pt-4 border-t border-dashed border-[#E0E0D1] space-y-2 text-xs">
              <div className="flex justify-between text-[#A4A291]">
                <span>Sous-total Panier</span>
                <span className="font-bold">{subTotal.toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-[#A4A291]">
                <span>Frais de transport</span>
                <span className="font-bold">+{deliveryFee.toLocaleString()} F</span>
              </div>
              <div className="flex justify-between text-[#5B4636] text-base font-black pt-2 border-t border-[#E0E0D1]">
                <span>Total Net</span>
                <span className="text-[#497A3A] italic">{totalAmount.toLocaleString()} F</span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS LOGISTIQUES */}
        <footer className="space-y-4 pt-4">
          {nextTargetStatus && transitionAllowed ? (
            <button
              type="button"
              onClick={() => updateStatus(nextTargetStatus)}
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

      </div>
    </div>
  );
}

const LoadingScreen = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-[#F7F5EE]">
    <FaSpinner className="w-12 h-12 text-[#497A3A] animate-spin" />
    <p className="mt-4 text-[10px] font-black text-[#7C795D] uppercase tracking-[0.4em]">Synchronisation...</p>
  </div>
);

const ErrorScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-[#F7F5EE] text-center">
    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6">
      <FaSearch className="text-stone-300 text-3xl" />
    </div>
    <h2 className="text-2xl font-black text-[#5B4636] uppercase tracking-tighter">Inconnu</h2>
    <p className="text-[#A4A291] text-[10px] font-bold uppercase mt-2 mb-8 max-w-50">
      Cette référence n'existe plus dans le flux logistique.
    </p>
    <button 
      onClick={onBack} 
      className="bg-[#5B4636] text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
    >
      Retour aux ventes
    </button>
  </div>
);