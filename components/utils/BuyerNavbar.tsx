'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingBasket, User, LogOut, Bot, ClipboardList, ChevronDown, LayoutDashboard, Store } from 'lucide-react';

const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  amber: '#D97706',
  sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.75)',
  border: 'rgba(6, 78, 59, 0.08)',
  muted: '#64748B',
  white: '#FFFFFF'
};

const BUYER_LINKS = [
  { name: 'Marché', href: '/market', icon: Store },
  { name: 'Dashboard', href: '/buyer-dashboard', icon: LayoutDashboard },
  { name: 'Commandes', href: '/orders', icon: ClipboardList },
  { name: 'Suivi Agent', href: '/conversations', icon: Bot },
];

export default function BuyerNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, userRole, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Helper pour déterminer si un lien est actif
  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: scrolled ? C.glass : C.white,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${C.border}`,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      height: 72,
      display: 'flex',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          {/* LOGO SECTION */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <Link href="/market" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ 
                width: 36, height: 36, borderRadius: 10, 
                background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}>
                <Store size={20} color="#fff" />
              </div>
              <span style={{ 
                fontFamily: "'Space Grotesk', sans-serif", 
                fontWeight: 800, fontSize: '1.4rem', color: C.forest, 
                letterSpacing: '-0.03em', display: 'flex', alignItems: 'center'
              }}>
                Agri<span style={{ color: C.emerald }}>Market</span>
              </span>
            </Link>

            {/* DESKTOP LINKS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden lg:flex">
              {BUYER_LINKS.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                    color: isActive(link.href) ? C.forest : C.muted,
                    textDecoration: 'none', padding: '8px 16px', borderRadius: 100,
                    transition: 'all 0.2s ease',
                    background: isActive(link.href) ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  className="hover:!text-[#064E3B] hover:!bg-[rgba(16,185,129,0.04)]"
                >
                  <link.icon size={15} style={{ opacity: isActive(link.href) ? 1 : 0.7 }} />
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            
            {isAuthenticated ? (
              <div className="relative group">
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 6px 6px 14px',
                  borderRadius: 100, border: `1px solid ${C.border}`, background: C.white,
                  cursor: 'pointer', transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }} className="hover:!border-[#10B981] hover:!shadow-md">
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: C.forest }}>
                    {user?.name?.split(' ')[0] || 'Compte'}
                  </span>
                  <div style={{ 
                    width: 32, height: 32, borderRadius: '50%', background: C.sand,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${C.border}`
                  }}>
                    <User size={16} color={C.forest} />
                  </div>
                </button>

                {/* DROPDOWN MENU */}
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 12, width: 220,
                  background: C.white, borderRadius: 20, border: `1px solid ${C.border}`,
                  boxShadow: '0 15px 45px rgba(6,78,59,0.12)',
                  padding: 8, opacity: 0, pointerEvents: 'none', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 110, transform: 'translateY(10px)'
                }} className="group-hover:!opacity-100 group-hover:!pointer-events-auto group-hover:!translate-y-0">
                  
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>Connecté en tant que</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.forest }}>{userRole}</p>
                  </div>

                  {['ADMIN', 'SUPERADMIN', 'AGENT'].includes(userRole as string) && (
                    <Link href={
                      ['ADMIN', 'SUPERADMIN'].includes(userRole as string) ? '/admin' : '/agent/deliveries'
                    } style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
                      fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                      color: C.amber, textDecoration: 'none', transition: 'background 0.2s',
                    }} className="hover:!bg-[#FFFBEB]">
                      <LayoutDashboard size={16} /> Console {userRole === 'AGENT' ? 'Livreur' : 'Admin'}
                    </Link>
                  )}

                  <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 14px', borderRadius: 12, border: 'none', background: 'transparent',
                    cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                    color: '#DC2626', transition: 'all 0.2s',
                  }} className="hover:!bg-red-50">
                    <LogOut size={16} /> Déconnexion
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" style={{
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                color: C.white, textDecoration: 'none', padding: '10px 24px', borderRadius: 100,
                background: C.forest, boxShadow: '0 4px 12px rgba(6, 78, 59, 0.15)',
                transition: 'all 0.3s ease',
              }} className="hover:!scale-105 active:!scale-95">
                Connexion
              </Link>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}