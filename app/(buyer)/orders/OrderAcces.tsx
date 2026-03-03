import { Package, Leaf, Lock } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

export const OrdersEmptyState = () => (
  <div style={{ textAlign: 'center' as const, padding: '60px 20px', background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}` }}>
    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
      <Leaf size={28} color={C.emerald} />
    </div>
    <h3 style={{ fontFamily: F.heading, fontSize: '1.1rem', fontWeight: 700, color: C.forest, margin: '0 0 6px' }}>Aucune commande</h3>
    <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.9rem', margin: 0 }}>Vous n'avez pas encore passe de commande.</p>
  </div>
);

export const OrdersAccessRequired = () => (
  <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
    <h1 style={{ fontFamily: F.heading, fontSize: '1.6rem', fontWeight: 800, color: C.forest, marginBottom: 24 }}>Mes Commandes</h1>
    <div style={{ textAlign: 'center' as const, padding: '60px 20px', background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}` }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(217,119,6,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Lock size={28} color={C.amber} />
      </div>
      <h3 style={{ fontFamily: F.heading, fontSize: '1.1rem', fontWeight: 700, color: C.forest, margin: '0 0 6px' }}>Acces requis</h3>
      <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.9rem', margin: 0 }}>Veuillez vous connecter pour voir vos commandes.</p>
    </div>
  </div>
);
