'use client';

import { CheckCircle2, WifiOff, Loader2, ShieldCheck } from 'lucide-react';
import { C } from '@/features/checkout/components/checkout/checkout-ui';

interface Props {
  cartTotal: number;
  isOnline: boolean;
  isProcessing: boolean;
}

export default function OrderTotalCard({ cartTotal, isOnline, isProcessing }: Props) {
  return (
  <div style={{ 
      background: C.forest, color: 'white', padding: 32, borderRadius: 32, 
      position: 'sticky', top: 24, boxShadow: `0 20px 40px -12px ${C.forest}40` 
  }}>
    <div style={{ marginBottom: 24 }}>
      <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 600 }}>Montant Total</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: '2.4rem', fontWeight: 900 }}>{cartTotal.toLocaleString()}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, opacity: 0.8 }}>CFA</span>
      </div>
    </div>

    <div style={{ 
      fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', 
      padding: '12px 16px', borderRadius: 14, marginBottom: 28, 
      display: 'flex', alignItems: 'center', gap: 10,
      color: isOnline ? '#A7F3D0' : '#FDE68A' 
    }}>
      {isOnline ? <CheckCircle2 size={16} /> : <WifiOff size={16} />}
      <span style={{ fontWeight: 600 }}>{isOnline ? 'Serveur prêt' : 'Mode hors-ligne (synchro auto)'}</span>
    </div>

    <button 
      type="submit" 
      disabled={isProcessing} 
      style={{ 
          width: '100%', padding: '20px', 
          background: isProcessing ? C.muted : `linear-gradient(135deg, ${C.amber}, #F59E0B)`, 
          color: 'white', border: 'none', borderRadius: 20, 
          fontWeight: 900, fontSize: '1rem', cursor: isProcessing ? 'not-allowed' : 'pointer', 
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
          boxShadow: isProcessing ? 'none' : '0 10px 20px -5px rgba(217,119,6,0.4)',
          transition: 'transform 0.2s, filter 0.2s'
      }}
      onMouseEnter={(e) => !isProcessing && (e.currentTarget.style.filter = 'brightness(1.1)')}
      onMouseLeave={(e) => !isProcessing && (e.currentTarget.style.filter = 'brightness(1)')}
    >
      {isProcessing ? (
        <>
          <Loader2 className="animate-spin" size={20} />
          <span>Traitement...</span>
        </>
      ) : (
        <>
          <ShieldCheck size={20} />
          <span>Confirmer la commande</span>
        </>
      )}
    </button>
    
    <p style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.5, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Paiement sécurisé par AgriConnect
    </p>
  </div>
  );
}
