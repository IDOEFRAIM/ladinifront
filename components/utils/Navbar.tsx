'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Leaf, Menu, X, LayoutDashboard, LogOut } from 'lucide-react';

const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  amber: '#D97706',
  sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)',
  border: 'rgba(6, 78, 59, 0.07)',
  muted: '#64748B',
};

const NAV_LINKS = [
  { name: 'Accueil', href: '/' },
  { name: 'Produits', href: '/products' },
  { name: 'Catalogue', href: '/catalogue' },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, userRole, logout } = useAuth();
  const pathname = usePathname();

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => { await logout(); window.location.href = '/login'; };

  const getUserDashboardPath = () => {
    switch (userRole?.toUpperCase()) {
      case 'SUPERADMIN': return '/admin';
      case 'ADMIN': return '/admin';
      case 'USER': return '/market';
      default: return '/login';
    }
  };

  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: scrolled ? C.glass : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.border}`,
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 4px 24px rgba(6,78,59,0.04)' : 'none',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>

          {/* LOGO */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: '#fff', padding: 8, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={20} />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1.25rem', color: C.forest, letterSpacing: '-0.02em' }}>
              Front<span style={{ color: C.emerald }}>Ag</span>
            </span>
          </Link>

          {/* DESKTOP LINKS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.name} href={link.href} style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600,
                  color: isActive ? C.forest : C.muted, textDecoration: 'none',
                  position: 'relative', padding: '4px 0', transition: 'color 0.2s',
                }}>
                  {link.name}
                  {isActive && <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: 100, background: `linear-gradient(90deg, ${C.emerald}, ${C.amber})` }} />}
                </Link>
              );
            })}
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isAuthenticated ? (
              <Link href={getUserDashboardPath()} className="hidden md:flex" style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.forest, color: '#fff', padding: '10px 20px', borderRadius: 100,
                fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, textDecoration: 'none',
                boxShadow: '0 2px 12px rgba(6,78,59,0.15)',
              }}>
                <LayoutDashboard size={16} /> Mon Espace
              </Link>
            ) : (
              <div className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link href="/login" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: C.forest, textDecoration: 'none', padding: '8px 16px', borderRadius: 100 }}>
                  Connexion
                </Link>
                <Link href="/signup" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#fff', background: C.forest, textDecoration: 'none', padding: '10px 20px', borderRadius: 100, boxShadow: '0 2px 12px rgba(6,78,59,0.15)' }}>
                  Inscription
                </Link>
              </div>
            )}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden" style={{ padding: 8, borderRadius: 12, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', color: C.forest, display: 'flex', alignItems: 'center' }}>
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {isMobileMenuOpen && (
          <div style={{ paddingBottom: 20, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 12 }} className="md:hidden">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.name} href={link.href} style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: isActive ? 700 : 500,
                  color: isActive ? C.forest : C.muted, textDecoration: 'none',
                  padding: '10px 16px', borderRadius: 12,
                  background: isActive ? 'rgba(16,185,129,0.06)' : 'transparent',
                }}>
                  {link.name}
                </Link>
              );
            })}
            {isAuthenticated ? (
              <>
                <Link href={getUserDashboardPath()} style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: C.forest, textDecoration: 'none', padding: '10px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LayoutDashboard size={16} /> Mon Espace
                </Link>
                <button onClick={handleLogout} style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: '#DC2626', padding: '10px 16px', borderRadius: 12, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LogOut size={16} /> Deconnexion
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8, padding: '8px 16px' }}>
                <Link href="/login" style={{ flex: 1, textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: C.forest, textDecoration: 'none', padding: '10px 16px', borderRadius: 100, border: `1px solid ${C.border}` }}>Connexion</Link>
                <Link href="/signup" style={{ flex: 1, textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#fff', background: C.forest, textDecoration: 'none', padding: '10px 16px', borderRadius: 100 }}>Inscription</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
