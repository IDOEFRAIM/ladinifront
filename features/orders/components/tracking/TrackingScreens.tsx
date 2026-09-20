'use client';

import { Loader2, AlertTriangle } from 'lucide-react';
import { C, F } from '@/features/orders/components/tracking/tracking-ui';

export const TrackingLoading = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
    <Loader2 size={32} style={{ color: C.emerald }} className="animate-spin" />
    <p style={{ fontFamily: F.body, color: C.muted, fontSize: 14, fontWeight: 500 }}>Localisation de votre commande...</p>
  </div>
);

export const TrackingError = ({ message, onBack }: { message: string; onBack: () => void }) => (
  <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center', padding: 32, background: '#fff', borderRadius: 24, border: `1px solid ${C.border}` }}>
    <AlertTriangle size={48} color={C.red} style={{ marginBottom: 16, opacity: 0.8 }} />
    <h2 style={{ fontFamily: F.heading, color: C.forest, marginBottom: 8 }}>Oups !</h2>
    <p style={{ fontFamily: F.body, color: C.muted, fontSize: 14, marginBottom: 24 }}>{message}</p>
    <button onClick={() => onBack()} style={{ width: '100%', padding: '12px', borderRadius: 12, background: C.forest, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
      Retour à mes commandes
    </button>
  </div>
);
