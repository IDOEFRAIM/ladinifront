'use client';

import { ShieldCheck, Copy, Check } from 'lucide-react';
import { C, F } from '@/features/orders/components/tracking/tracking-ui';

interface Props {
  code: string;
  copied: boolean;
  onCopy: () => void;
}

export default function OtpCard({ code, copied, onCopy }: Props) {
  return (
  <div style={{ background: `linear-gradient(135deg, ${C.forest} 0%, #065F46 100%)`, borderRadius: 24, padding: 24, marginBottom: 24, boxShadow: '0 10px 25px rgba(6, 78, 59, 0.15)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}>
      <ShieldCheck size={120} color="#fff" />
    </div>
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 100 }}>
          <ShieldCheck size={14} color={C.emerald} />
          <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>Sécurité Livraison</span>
        </div>
        <button onClick={onCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 600 }}>
          {copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}
        </button>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2.5rem', fontWeight: 800, letterSpacing: 8, color: '#fff', textAlign: 'center', margin: '10px 0' }}>
        {code}
      </div>
      <p style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', maxWidth: 280, margin: '0 auto' }}>
        Ne partagez ce code qu'avec le livreur une fois vos produits vérifiés.
      </p>
    </div>
  </div>
  );
}
