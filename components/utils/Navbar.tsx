'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Leaf, Menu, X, LayoutDashboard, LogOut, ArrowRight } from 'lucide-react';

const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  amber: '#D97706',
  glass: 'rgba(255, 255, 255, 0.85)',
  border: 'rgba(6, 78, 59, 0.08)',
  muted: '#64748B',
};

const NAV_LINKS = [
  { name: 'Accueil', href: '/' },
  { name: 'Enchères', href: '/auction' },
  { name: 'Catalogue', href: '/catalogue' },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, userRole, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Gestion du scroll avec optimisation
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getUserDashboardPath = () => {
    const role = userRole?.toUpperCase();
    if (role === 'SUPERADMIN' || role === 'ADMIN') return '/admin';
    if (role === 'PRODUCER') return '/dashboard';
    if (role === 'BUYER') return '/buyer-dashboard';
    if (role === 'AGENT') return '/agent/deliveries';
    return '/market';
  };

  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? C.glass : 'white',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: scrolled ? '0px 0' : '8px 0',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>
          
          {/* LOGO */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', transition: 'transform 0.2s' }} className="hover:scale-105 active:scale-95">
            <div style={{ 
              background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, 
              color: '#fff', padding: 8, borderRadius: 12, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${C.emerald}33`
            }}>
              <Leaf size={20} />
            </div>
            <span style={{ 
              fontFamily: "'Space Grotesk', sans-serif", 
              fontWeight: 800, fontSize: '1.4rem', 
              color: C.forest, letterSpacing: '-0.03em' 
            }}>
              Front<span style={{ color: C.emerald }}>Ag</span>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hidden md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.name} href={link.href} style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600,
                  color: isActive ? C.forest : C.muted, textDecoration: 'none',
                  padding: '8px 16px', borderRadius: 100, transition: 'all 0.2s',
                  background: isActive ? 'rgba(16,185,129,0.08)' : 'transparent',
                }}>
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isAuthenticated ? (
              <Link href={getUserDashboardPath()} className="hidden md:flex" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.forest, color: '#fff', padding: '10px 22px', borderRadius: 100,
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: 'none',
                boxShadow: `0 8px 20px ${C.forest}25`, transition: 'transform 0.2s'
              }}>
                <LayoutDashboard size={16} /> Mon Espace
              </Link>
            ) : (
              <div className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Link href="/login" style={{ 
                  fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, 
                  color: C.forest, textDecoration: 'none', padding: '10px 20px' 
                }}>
                  Connexion
                </Link>
                <Link href="/signup" style={{ 
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, 
                  color: '#fff', background: C.forest, textDecoration: 'none', 
                  padding: '10px 22px', borderRadius: 100, boxShadow: `0 8px 20px ${C.forest}25`
                }}>
                  Rejoindre <ArrowRight size={14} style={{ marginLeft: 6, display: 'inline' }} />
                </Link>
              </div>
            )}

            {/* BTN MOBILE MENU */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="md:hidden" 
              style={{ 
                padding: 10, borderRadius: 12, border: 'none', 
                background: isMobileMenuOpen ? 'rgba(6,78,59,0.05)' : 'transparent', 
                cursor: 'pointer', color: C.forest, display: 'flex' 
              }}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU PANEL */}
        {isMobileMenuOpen && (
          <div 
            style={{ 
              position: 'absolute', top: '100%', left: 0, right: 0, 
              background: 'white', padding: '16px 20px 32px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex', flexDirection: 'column', gap: 8,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              animation: 'slideDown 0.3s ease-out'
            }} 
            className="md:hidden"
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Menu Principal</div>
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.name} href={link.href} style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: isActive ? 700 : 600,
                  color: isActive ? C.forest : C.muted, textDecoration: 'none',
                  padding: '14px 16px', borderRadius: 12,
                  background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(249, 251, 248, 0.5)',
                }}>
                  {link.name}
                </Link>
              );
            })}

            <div style={{ height: 1, background: C.border, margin: '8px 0' }} />

            {isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href={getUserDashboardPath()} style={{ 
                  fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, 
                  color: 'white', background: C.forest, textDecoration: 'none', 
                  padding: '14px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 
                }}>
                  <LayoutDashboard size={18} /> Mon Tableau de Bord
                </Link>
                <button onClick={handleLogout} style={{ 
                  fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, 
                  color: '#DC2626', padding: '14px 16px', borderRadius: 12, 
                  background: '#FEF2F2', border: 'none', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', gap: 12 
                }}>
                  <LogOut size={18} /> Déconnexion
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href="/signup" style={{ 
                  textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 15, 
                  fontWeight: 700, color: '#fff', background: C.forest, 
                  textDecoration: 'none', padding: '14px 16px', borderRadius: 12 
                }}>
                  Créer un compte
                </Link>
                <Link href="/login" style={{ 
                  textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 15, 
                  fontWeight: 600, color: C.forest, textDecoration: 'none', 
                  padding: '14px 16px', borderRadius: 12, border: `1px solid ${C.border}` 
                }}>
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </nav>
  );
}