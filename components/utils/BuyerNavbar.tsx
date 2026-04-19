'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingBasket, User, LogOut, Bot, ClipboardList, ChevronDown } from 'lucide-react';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
};

const BUYER_LINKS = [
  { name: 'Le Marche', href: '/catalogue' },
  { name: 'Commandes', href: '/orders' },
  { name: 'Suivi Agent', href: '/conversations', icon: Bot },
];

export default function BuyerNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, userRole, user, logout } = useAuth();
  const pathname = usePathname();

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const totalItems = 0;

  const handleLogout = async () => { await logout(); window.location.href = '/login'; };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: scrolled ? C.glass : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${C.border}`,
      transition: 'all 0.3s ease',
      boxShadow: scrolled ? '0 4px 24px rgba(6,78,59,0.04)' : 'none',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>

          {/* LOGO */}
          <Link href="/market" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1.35rem', color: C.forest, letterSpacing: '-0.02em' }}>
              Agri<span style={{ color: C.emerald }}>Market</span>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden md:flex">
            {BUYER_LINKS.map((link) => {
              const isActive = pathname.startsWith(link.href) && (link.href !== '/market' || pathname === '/market');
              return (
                <Link key={link.name} href={link.href} style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
                  color: isActive ? C.forest : C.muted, textDecoration: 'none',
                  padding: '8px 16px', borderRadius: 100, transition: 'all 0.2s',
                  background: isActive ? 'rgba(16,185,129,0.06)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {link.icon && <link.icon size={14} />}
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* CART */}
            <Link href="/cart" style={{
              position: 'relative', padding: 8, borderRadius: 12,
              color: C.forest, display: 'flex', alignItems: 'center', textDecoration: 'none',
              transition: 'background 0.2s',
            }}>
              <ShoppingBasket size={22} />
              {totalItems > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0,
                  background: C.amber, color: '#fff', fontSize: 10, fontWeight: 800,
                  width: 18, height: 18, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: 'translate(25%, -25%)',
                }}>{totalItems}</span>
              )}
            </Link>

            {/* USER MENU DESKTOP */}
            <div className="hidden md:block">
              {isAuthenticated ? (
                <div className="relative group">
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                    borderRadius: 100, border: `1px solid ${C.border}`, background: 'transparent',
                    cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: C.forest,
                  }}>
                    <User size={16} />
                    <span>{user?.name || 'Mon Compte'}</span>
                    <ChevronDown size={14} style={{ opacity: 0.5 }} />
                  </button>
                  <div style={{
                    position: 'absolute', right: 0, marginTop: 8, width: 200,
                    background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: 16, border: `1px solid ${C.border}`,
                    boxShadow: '0 12px 40px rgba(6,78,59,0.08)',
                    padding: 6, opacity: 0, pointerEvents: 'none', transition: 'all 0.2s',
                    zIndex: 50,
                  }} className="group-hover:!opacity-100 group-hover:!pointer-events-auto">
                    {userRole !== 'USER' && (
                      <Link href={['ADMIN', 'SUPERADMIN'].includes(userRole as string) ? '/admin' : '/dashboard'} style={{
                        display: 'block', padding: '10px 14px', borderRadius: 10,
                        fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
                        color: C.forest, textDecoration: 'none', transition: 'background 0.2s',
                      }} className="hover:!bg-[rgba(16,185,129,0.06)]">
                        Basculer vers {['ADMIN', 'SUPERADMIN'].includes(userRole as string) ? 'Admin' : 'Dashboard'}
                      </Link>
                    )}
                    <button onClick={handleLogout} style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '10px 14px', borderRadius: 10, border: 'none', background: 'transparent',
                      cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
                      color: '#DC2626', textAlign: 'left', transition: 'background 0.2s',
                    }} className="hover:!bg-red-50">
                      <LogOut size={14} /> Deconnexion
                    </button>
                  </div>
                </div>
              ) : (
                <Link href="/login" style={{
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
                  color: C.forest, textDecoration: 'none', padding: '10px 20px', borderRadius: 100,
                  background: 'rgba(16,185,129,0.06)', transition: 'all 0.2s',
                }}>Connexion</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
