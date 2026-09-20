import Link from 'next/link';
import { Leaf, MapPin, Heart, Mail, Phone } from 'lucide-react';
import { C, F } from '@/components/home/tokens';

const footerLink = { color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.9rem', fontFamily: F.body } as const;
const footerTitle = { fontFamily: F.heading, fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, color: C.amber } as const;
const footerList = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 } as const;

export default function Footer() {
  return (
    <footer style={{ background: C.forest, color: '#fff', paddingTop: 60, paddingBottom: 30, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 6%' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10" style={{ marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.emerald, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Leaf size={18} color="#fff" />
              </div>
              <span style={{ fontFamily: F.heading, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>LADINI</span>
            </div>
            <p style={{ fontFamily: F.body, color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Le marché agricole direct. Nous connectons la terre et la table pour une rémunération juste des producteurs et des produits locaux d&apos;exception.
            </p>
          </div>

          <nav aria-label="Navigation">
            <h2 style={footerTitle}>Navigation</h2>
            <ul style={footerList}>
              <li><Link className="footer-link" href="/production" style={footerLink}>Vendre ma production</Link></li>
              <li><Link className="footer-link" href="/buyer-dashboard" style={footerLink}>Espace Acheteur</Link></li>
              <li><Link className="footer-link" href="/catalogue" style={footerLink}>Nos Produits &amp; Offres</Link></li>
            </ul>
          </nav>

          <nav aria-label="Informations légales">
            <h2 style={footerTitle}>Légal &amp; Confidentialité</h2>
            <ul style={footerList}>
              <li><Link className="footer-link" href="/cgu" style={footerLink}>Conditions Générales d&apos;Utilisation (CGU)</Link></li>
              <li><Link className="footer-link" href="/cluf" style={footerLink}>Contrat de Licence Utilisateur (CLUF)</Link></li>
              <li><Link className="footer-link" href="/privacy" style={footerLink}>Politique de Confidentialité</Link></li>
            </ul>
          </nav>

          <div>
            <h2 style={footerTitle}>Contactez-nous</h2>
            <address style={{ fontStyle: 'normal', display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.9rem', fontFamily: F.body, color: 'rgba(255,255,255,0.85)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Phone size={16} color={C.emerald} /><span>+226 01 47 98 00 / +226 68 81 52 99</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Mail size={16} color={C.emerald} /><span>contact@ladini.com</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><MapPin size={16} color={C.emerald} /><span>Burkina Faso</span></div>
            </address>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: F.body, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>© {new Date().getFullYear()} LADINI. Tous droits réservés.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: F.body, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            <span>Fait avec</span>
            <Heart size={14} color="#ef4444" fill="#ef4444" />
            <span>pour nos producteurs</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
