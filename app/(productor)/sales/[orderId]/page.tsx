"use client";

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  FaArrowLeft, 
  FaSpinner, 
  FaSearch, 
  FaFilePdf, 
  FaClock, 
  FaTruck, 
  FaCheckCircle 
} from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';

// Import de tes composants UI
import { StatusBadge } from '@/components/orders/statusCard';
import { CustomerCard } from '@/components/orders/customerCard';
import { OrderSummary } from '@/components/orders/orderSummary';

// --- CONFIGURATION LOGISTIQUE ---
// Aligné sur ton VALID_ORDER_STATUSES du validateur Zod
const LOGISTICS_STEPS: Record<string, { label: string; next: string; icon: any; theme: string }> = {
  PENDING: { 
    label: 'Confirmer la préparation', 
    next: 'CONFIRMED', 
    icon: FaClock, 
    theme: 'bg-[#5B4636]' 
  },
  CONFIRMED: { 
    label: 'Mettre en livraison', 
    next: 'SHIPPED', 
    icon: FaTruck, 
    theme: 'bg-[#497A3A]' 
  },
  SHIPPED: { 
    label: 'Marquer comme livré', 
    next: 'DELIVERED', 
    icon: FaCheckCircle, 
    theme: 'bg-green-600' 
  },
  DELIVERED: { 
    label: 'Commande Terminée', 
    next: '', 
    icon: FaCheckCircle, 
    theme: 'bg-[#A4A291]' 
  },
  CANCELLED: {
    label: 'Commande Annulée',
    next: '',
    icon: FaSearch,
    theme: 'bg-red-500'
  }
};

// --- HOOK PERSONNALISÉ : GESTION DES DONNÉES ---
function useOrder(orderId: string) {
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setStatus('loading');
      const { data } = await axios.get(`/api/orders/${orderId}`);
      
      // Normalisation du statut en MAJUSCULES pour la config
      data.status = data.status.toUpperCase();
      
      // Pré-formatage de la date
      data.displayDate = new Date(data.date).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
      });
      
      setOrder(data);
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
      await axios.patch(`/api/orders/${orderId}`, { status: nextStatus });
      setOrder((prev: any) => ({ ...prev, status: nextStatus }));
    } catch (err) {
      alert("Erreur lors de la mise à jour du statut.");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, status, isUpdating, updateStatus };
}

// --- SOUS-COMPOSANTS D'ÉTAT (LOADING / ERROR) ---
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

// --- COMPOSANT PRINCIPAL ---
export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  
  // Utilisation du hook de données
  const { order, status, isUpdating, updateStatus } = useOrder(orderId);

  // Gestion des affichages conditionnels hors du flux principal
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'error' || !order) return <ErrorScreen onBack={() => router.push('/sales')} />;

  // Calculs de variables pour le rendu
  const step = LOGISTICS_STEPS[order.status] || LOGISTICS_STEPS.PENDING;
  const isFinalStatus = order.status === 'DELIVERED' || order.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-[#F7F5EE] pb-24 font-sans animate-in fade-in duration-500">
      
      {/* BARRE DE NAVIGATION FIXE */}
      <nav className="sticky top-0 z-50 bg-[#F7F5EE]/80 backdrop-blur-xl border-b border-[#E0E0D1] p-6 flex justify-between items-center">
        <button 
          onClick={() => router.back()}
          className="w-12 h-12 bg-white rounded-2xl border border-[#E0E0D1] flex items-center justify-center shadow-sm active:scale-90 transition-transform text-[#5B4636]"
        >
          <FaArrowLeft size={14} />
        </button>
        <StatusBadge status={order.status} />
      </nav>

      <div className="p-6 max-w-xl mx-auto space-y-8">
        
        {/* EN-TÊTE DE LA COMMANDE */}
        <header className="space-y-3">
          <p className="text-[10px] font-black text-[#A4A291] uppercase tracking-[0.3em]">
            RÉFÉRENCE : {order.id.slice(-12).toUpperCase()}
          </p>
          <h1 className="text-5xl font-black text-[#5B4636] tracking-tighter uppercase leading-none">
            Détails
          </h1>
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#E0E0D1] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-[#5B4636] uppercase italic">
              {order.displayDate}
            </span>
          </div>
        </header>

        {/* SECTION DES CARTES D'INFORMATION (BENTO) */}
        <div className="grid gap-6">
          <CustomerCard 
            name={order.customerName} 
            location={order.location} 
            phone={order.customerPhone} 
          />
          <OrderSummary 
            items={order.items} 
            deliveryFee={order.deliveryFee} 
          />
        </div>

        {/* PIED DE PAGE : ACTIONS LOGISTIQUES */}
        <footer className="space-y-4 pt-6">
          <button
            onClick={() => updateStatus(step.next)}
            disabled={isUpdating || isFinalStatus || !step.next}
            className={`w-full py-7 rounded-[2.5rem] flex items-center justify-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 ${
              isFinalStatus 
                ? 'bg-[#E0E0D1] text-[#A4A291] cursor-not-allowed border border-[#D1D1C2]' 
                : `${step.theme} text-white hover:brightness-110 shadow-xl`
            }`}
          >
            {isUpdating ? (
              <FaSpinner className="animate-spin text-lg" />
            ) : (
              <>
                <step.icon size={20} className="opacity-80" />
                {step.label}
              </>
            )}
          </button>

          <button className="w-full flex items-center justify-center gap-2 py-4 text-[#A4A291] font-black text-[9px] uppercase tracking-[0.2em] hover:text-[#5B4636] transition-colors group">
            <FaFilePdf size={14} className="group-hover:scale-110 transition-transform" />
            Télécharger le bon de commande PDF
          </button>
        </footer>

      </div>
    </div>
  );
}