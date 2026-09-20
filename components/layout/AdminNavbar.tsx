'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Bot, Map, Users, Warehouse, 
  CheckCircle, Settings, LogOut, Eye, ClipboardList, 
  Tags, Menu, X 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  amber: '#D97706',
  glass: 'rgba(255, 255, 255, 0.85)',
  border: 'rgba(6, 78, 59, 0.1)',
  muted: '#64748B',
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
  { name: 'Paramètres', href: '/admin/settings', icon: Settings },
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const currentPath = pathname ?? '';
  const { logout, userRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Empêcher le scroll quand le menu mobile est ouvert
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [mobileOpen]);

  const roleUpper = (userRole || '').toString().toUpperCase();
  const items = [...adminNavItems];
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN') {
    items.push({ name: 'Organisations', href: '/admin/organizations', icon: LayoutDashboard });
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* --- DESKTOP & TABLET NAVBAR --- */}
      <nav 
        className="sticky top-0 z-[100] w-full border-b backdrop-blur-md"
        style={{ background: C.glass, borderColor: C.border }}
      >
        <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between h-16">
          
          {/* Logo / Mobile Trigger */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 hover:bg-black/5 rounded-lg"
            >
              <Menu size={24} color={C.forest} />
            </button>
            <div className="font-bold text-emerald-900 hidden sm:block">Admin<span className="text-emerald-500">Panel</span></div>
          </div>

          {/* Navigation Items (Scrollable horizontalement sur petits écrans) */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar px-2 flex-1 max-w-4xl">
            {items.map((item) => {
              const isActive = item.exact
                ? currentPath === item.href
                : currentPath.startsWith(item.href) && currentPath !== '/admin';

              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all whitespace-nowrap"
                  style={{ 
                    background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
                    color: isActive ? C.forest : C.muted 
                  }}
                >
                  <item.icon size={18} />
                  <span className="text-sm font-semibold">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold text-sm"
          >
            <LogOut size={18} />
            <span>Quitter</span>
          </button>
        </div>
      </nav>

      {/* --- MOBILE DRAWER (SIDEBAR) --- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[110] md:hidden">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="absolute top-0 left-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b flex justify-between items-center">
              <span className="font-black text-emerald-800">MENU ADMIN</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 bg-slate-50 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items.map((item) => {
                const isActive = item.exact
                  ? currentPath === item.href
                  : currentPath.startsWith(item.href) && currentPath !== '/admin';
                
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-colors"
                    style={{ 
                      background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
                      color: isActive ? C.forest : C.muted 
                    }}
                  >
                    <item.icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="p-4 border-t">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-4 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut size={20} />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}