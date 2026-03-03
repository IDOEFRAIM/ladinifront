'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bot, Map, Users, Warehouse, CheckCircle, Settings, LogOut, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
};

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Œil de Dieu', href: '/admin/eye-of-god', icon: Eye },
  { name: 'Agents IA', href: '/admin/monitoring', icon: Bot },
  { name: 'Territoires', href: '/admin/territories', icon: Map },
  { name: 'Producteurs', href: '/admin/producers', icon: Users },
  { name: 'Stocks', href: '/admin/stock', icon: Warehouse },
  { name: 'Validations', href: '/admin/validations', icon: CheckCircle },
  { name: 'Parametres', href: '/admin/settings', icon: Settings },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { userRole } = useAuth();

  // Build nav items and include admin-only actions
  const items = [...adminNavItems];
  const roleUpper = (userRole || '').toString().toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN') {
    items.push({ name: 'Créer Organisation', href: '/admin/organizations/create', icon: LayoutDashboard });
  }

  const handleLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    logout();
  };

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${C.border}`,
      boxShadow: '0 -4px 24px rgba(6,78,59,0.04)',
      zIndex: 40,
    }} className="md:relative md:border-t-0 md:border-b md:shadow-none md:!bottom-auto">
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 64, maxWidth: 1280, margin: '0 auto' }}
        className="md:!justify-start md:!gap-2 md:!h-auto md:!py-2 md:!px-0">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && pathname !== '/admin';

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
  );
}
