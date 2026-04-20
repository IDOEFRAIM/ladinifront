'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bot, Map, Users, Warehouse, CheckCircle, Settings, LogOut, Eye, ClipboardList, Tags } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
};

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Œil de Dieu', href: '/admin/eye-of-god', icon: Eye },
  { name: 'Commandes', href: '/admin/orders/kanban', icon: ClipboardList },
  { name: 'Gouvernance', href: '/admin/governance', icon: Tags },
  { name: 'Agents IA', href: '/admin/monitoring', icon: Bot },
  { name: 'Territoires', href: '/admin/territories', icon: Map },
  { name: 'Producteurs', href: '/admin/producers', icon: Users },
  { name: 'Stocks', href: '/admin/stock', icon: Warehouse },
  { name: 'Validations', href: '/admin/validations', icon: CheckCircle },
  { name: 'Parametres', href: '/admin/settings', icon: Settings },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const currentPath = pathname ?? '';
  const { logout } = useAuth();
  const { userRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Build nav items and include admin-only actions
  const items = [...adminNavItems];
  const roleUpper = (userRole || '').toString().toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN') {
    items.push({ name: 'Gérer les Organisation', href: '/admin/organizations/', icon: LayoutDashboard });
  }

  const handleLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    logout();
  };

  return (
    <>
      {/* Desktop / medium+ nav (unchanged) */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${C.border}`,
        boxShadow: '0 -4px 24px rgba(6,78,59,0.04)',
        zIndex: 40,
      }} className="hidden md:block md:relative md:border-t-0 md:border-b md:shadow-none md:!bottom-auto">
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 64, maxWidth: 1280, margin: '0 auto' }}
          className="md:!justify-start md:!gap-2 md:!h-auto md:!py-2 md:!px-0">
          {items.map((item) => {
          const isActive = item.exact
            ? currentPath === item.href
            : currentPath.startsWith(item.href) && currentPath !== '/admin';

          return (
            <Link key={item.name} href={item.href} style={{ textDecoration: 'none', flex: '1', maxWidth: 100 }} className="md:!flex-none md:!max-w-none">
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '8px 4px', textAlign: 'center', transition: 'all 0.2s', borderRadius: 12,
                background: isActive ? 'rgba(16,185,129,0.08)' : 'transparent',
              }} className="md:!flex-row md:!p-2 md:!px-3 md:!gap-2">
                <item.icon size={18} style={{ color: isActive ? C.forest : C.muted, transition: 'color 0.2s' }} />
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10, fontWeight: isActive ? 700 : 500,
                  color: isActive ? C.forest : C.muted,
                  transition: 'color 0.2s',
                }} className="md:!text-[13px]">
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}

          <button onClick={handleLogout} style={{
            display: 'none', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 12,
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
            color: '#DC2626', transition: 'all 0.2s',
          }} className="md:!flex hover:!bg-red-50" aria-label="Deconnexion">
            <LogOut size={16} />
            <span>Quitter</span>
          </button>
        </div>
      </nav>

      {/* Mobile: small screen button toggles nav panel */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen((s) => !s)}
          aria-label="Ouvrir le menu admin"
          style={{
            position: 'fixed', bottom: 16, right: 16, zIndex: 50,
            background: C.forest, color: 'white', border: 'none', borderRadius: 999, width: 56, height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(6,78,59,0.16)'
          }}
        >
          {/* simple icon: use LayoutDashboard */}
          <LayoutDashboard size={20} />
        </button>

        {mobileOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 45 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} onClick={() => setMobileOpen(false)} />
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 86, background: C.glass, borderRadius: 12, padding: 12, maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item) => {
                  const isActive = item.exact
                    ? currentPath === item.href
                    : currentPath.startsWith(item.href) && currentPath !== '/admin';
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: isActive ? 'rgba(16,185,129,0.06)' : 'transparent' }}>
                        <item.icon size={18} style={{ color: isActive ? C.forest : C.muted }} />
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: isActive ? C.forest : C.muted, fontWeight: isActive ? 700 : 600 }}>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}

                <button onClick={(e) => { setMobileOpen(false); handleLogout(e); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'transparent', border: 'none', color: '#DC2626', marginTop: 6 }}>
                  <LogOut size={18} /> <span style={{ fontWeight: 700 }}>Quitter</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
