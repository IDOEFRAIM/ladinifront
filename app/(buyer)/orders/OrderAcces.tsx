import Link from 'next/link';
import { Package, Leaf, Lock, ShoppingBag, ArrowRight } from 'lucide-react';

const C = { 
  forest:'#064E3B', 
  emerald:'#10B981', 
  amber:'#D97706', 
  sand:'#F9FBF8', 
  glass:'rgba(255,255,255,0.72)', 
  border:'rgba(6,78,59,0.07)', 
  muted:'#64748B', 
  text:'#1F2937' 
};
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

// Style commun pour les conteneurs de message
const containerStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '64px 24px',
  background: C.glass,
  backdropFilter: 'blur(20px)',
  borderRadius: 28,
  border: `1px solid ${C.border}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 8px 32px rgba(6, 78, 59, 0.04)'
};

const buttonStyle: React.CSSProperties = {
  marginTop: 24,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 24px',
  borderRadius: 100,
  background: C.forest,
  color: 'white',
  textDecoration: 'none',
  fontFamily: F.body,
  fontSize: '0.9rem',
  fontWeight: 700,
  transition: 'transform 0.2s'
};

/**
 * État quand la liste est vide (Client connecté mais 0 achats)
 */
export const OrdersEmptyState = () => (
  <div style={containerStyle}>
    <div style={{ width: 72, height: 72, borderRadius: '24px', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
      <ShoppingBag size={32} color={C.emerald} />
    </div>
    <h3 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 800, color: C.forest, margin: '0 0 8px' }}>
      Votre panier attend...
    </h3>
    <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.95rem', maxWidth: 300, lineHeight: 1.5 }}>
      Vous n'avez pas encore passé de commande. Nos produits frais n'attendent que vous !
    </p>
    <Link href="/catalogue" style={buttonStyle}>
      Découvrir le catalogue <ArrowRight size={18} />
    </Link>
  </div>
);

/**
 * État quand l'utilisateur n'est pas connecté
 */
export const OrdersAccessRequired = () => (
  <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
    <div style={containerStyle}>
      <div style={{ width: 72, height: 72, borderRadius: '24px', background: 'rgba(217,119,6,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Lock size={32} color={C.amber} />
      </div>
      <h3 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 800, color: C.forest, margin: '0 0 8px' }}>
        Accès restreint
      </h3>
      <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.95rem', maxWidth: 320, lineHeight: 1.5 }}>
        Veuillez vous connecter à votre compte pour suivre vos commandes en temps réel.
      </p>
      <Link href="/login" style={{ ...buttonStyle, background: C.amber }}>
        Se connecter maintenant
      </Link>
    </div>
  </div>
);