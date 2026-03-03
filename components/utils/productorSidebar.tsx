'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart3, Bot, Warehouse, Package, ShoppingCart, Settings,
  PlusCircle, Users, LogOut, X, ChevronLeft, ChevronRight, Circle
} from 'lucide-react';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
};

const PRODUCER_LINKS = [
  { name: 'Tableau de bord', href: '/dashboard', icon: BarChart3 },
  { name: 'Mes Agents IA', href: '/agents', icon: Bot },
  { name: 'Mon Stock', href: '/inventory', icon: Warehouse },
  { name: 'Catalogue', href: '/products', icon: Package },
  { name: 'Ventes', href: '/sales', icon: ShoppingCart },
  { name: 'Nouveau Produit', href: '/products/add', icon: PlusCircle },
  { name: 'Mes Clients', href: '/clients', icon: Users },
  { name: 'Parametres', href: '/settings', icon: Settings },
];

export default function ProductorSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(6,78,59,0.08)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:h-screen
          ${isCollapsed ? 'w-24' : 'w-72'}
        `}
        style={{
          background: C.sand,
          borderRight: `1px solid ${C.border}`,
        }}
      >
        {/* Toggle Button Desktop */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex"
          style={{
            position: 'absolute', right: -12, top: 40,
            width: 24, height: 24,
            background: '#fff', border: `1px solid ${C.border}`,
            borderRadius: '50%', alignItems: 'center', justifyContent: 'center',
            color: C.muted, cursor: 'pointer', zIndex: 50,
            boxShadow: '0 2px 8px rgba(6,78,59,0.06)',
            transition: 'all 0.2s',
          }}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: isCollapsed ? 16 : 24 }}>

          {/* HEADER */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            paddingLeft: isCollapsed ? 0 : 8, marginBottom: 40, flexShrink: 0,
          }}>
            <Link href="/dashboard" onClick={onClose} style={{ textDecoration: 'none' }}>
              {isCollapsed ? (
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: C.forest }}>
                  F<span style={{ color: C.emerald }}>.</span>
                </span>
              ) : (
                <div>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.75rem', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em', display: 'block', lineHeight: 1 }}>
                    FrontAg<span style={{ color: C.emerald }}>.</span>
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4, display: 'block' }}>
                    Espace Producteur
                  </span>
                </div>
              )}
            </Link>
            <button onClick={onClose} className="md:hidden" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {/* NAVIGATION */}
          <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 8 }}>
            {PRODUCER_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={onClose}
                  title={isCollapsed ? link.name : ''}
                  style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    padding: isCollapsed ? '14px 0' : '12px 18px',
                    borderRadius: 16, textDecoration: 'none',
                    transition: 'all 0.3s',
                    background: isActive ? C.glass : 'transparent',
                    border: isActive ? `1px solid ${C.border}` : '1px solid transparent',
                    boxShadow: isActive ? '0 2px 12px rgba(6,78,59,0.04)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : 14 }}>
                    <link.icon size={isCollapsed ? 20 : 18} style={{ color: isActive ? C.forest : C.muted, transition: 'color 0.2s' }} />
                    {!isCollapsed && (
                      <span style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: isActive ? 700 : 600,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: isActive ? C.forest : C.muted, transition: 'color 0.2s',
                      }}>
                        {link.name}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && isActive && (
                    <Circle size={6} fill={C.emerald} color={C.emerald} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* FOOTER / LOGOUT */}
          <div style={{ paddingTop: 20, marginTop: 'auto', borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={() => { onClose(); logout(); }}
              title={isCollapsed ? 'Deconnexion' : ''}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? 0 : 14,
                padding: isCollapsed ? 14 : '12px 18px',
                borderRadius: 16, border: 'none', cursor: 'pointer',
                background: 'rgba(220,38,38,0.06)', color: '#DC2626',
                transition: 'all 0.2s',
                fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              <LogOut size={isCollapsed ? 18 : 16} />
              {!isCollapsed && <span>Deconnexion</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
