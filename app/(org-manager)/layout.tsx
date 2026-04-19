'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Settings, Shield, Users, MapPin, ChevronLeft, Menu, Loader2, Building2, Package, List, PlusCircle } from 'lucide-react';

// ─── Design tokens (aligned with style-guide.ts) ────────────────────────────
const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  amber: '#D97706',
  sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.92)',
  border: 'rgba(6, 78, 59, 0.08)',
  muted: '#64748B',
  danger: '#DC2626',
};

const NAV_ITEMS = [
  { href: '/org/settings', label: 'Paramètres', icon: Settings },
  { href: '/org/roles', label: 'Rôles', icon: Shield },
  { href: '/org/members', label: 'Membres', icon: Users },
  { href: '/org/work-zones', label: 'Zones de travail', icon: MapPin },
  { href: '/org/allocations', label: 'Allocations', icon: Package },
  { href: '/org/distributions', label: 'Distributions', icon: List },
  { href: '/org/distributions/create', label: 'Nouvelle distribution', icon: PlusCircle },
];

function OrgSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { activeOrg } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static z-50 top-0 left-0 h-full
          w-64 flex flex-col
          transition-transform duration-200 ease-out
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ background: C.glass, borderRight: `1px solid ${C.border}` }}
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={18} style={{ color: C.forest }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>
              Gestion Organisation
            </span>
          </div>
          {activeOrg && (
            <p className="text-sm font-semibold truncate" style={{ color: C.forest }}>
              {activeOrg.name}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <a
                key={href}
                href={href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150
                  ${isActive
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}
                `}
              >
                <Icon size={18} />
                {label}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t" style={{ borderColor: C.border }}>
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <ChevronLeft size={16} />
            Retour au tableau de bord
          </a>
        </div>
      </aside>
    </>
  );
}

export default function OrgManagerLayout({ children }: { children: React.ReactNode }) {
  const { userRole, isAuthenticated, isLoading, activeOrg } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showContinueBtn, setShowContinueBtn] = useState(false);

  // ─── Access control ────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }

    const role = userRole?.toUpperCase();
    // System admins always pass
    if (role === 'SUPERADMIN' || role === 'ADMIN') return;

    // Must have an active org selected
    if (!activeOrg) {
      router.replace('/select-org');
      return;
    }

    // Only ADMIN and ZONE_MANAGER can access org-manager
    const orgRoleStr = activeOrg.role?.toUpperCase();
    if (orgRoleStr !== 'ADMIN' && orgRoleStr !== 'ZONE_MANAGER') {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, userRole, activeOrg, router]);

  useEffect(() => {
    if (!isLoading) { setShowContinueBtn(false); return; }
    const t = setTimeout(() => setShowContinueBtn(true), 3500);
    return () => clearTimeout(t);
  }, [isLoading]);

  // ─── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.sand }}>
        <Loader2 size={36} className="animate-spin" style={{ color: C.emerald }} />
        <p className="text-sm font-medium mt-4" style={{ color: C.muted }}>
          Vérification des accès organisation…
        </p>
        {showContinueBtn && (
          <button
            onClick={() => router.replace('/login')}
            className="mt-4 px-5 py-2.5 rounded-full text-white text-sm font-bold"
            style={{ background: C.amber }}
          >
            Problème ? Retour à la connexion
          </button>
        )}
      </div>
    );
  }

  // ─── Guard: not authenticated or no access ─────────────────────────────
  const role = userRole?.toUpperCase();
  const isSystemAdmin = role === 'SUPERADMIN' || role === 'ADMIN';
  if (!isAuthenticated || (!isSystemAdmin && !activeOrg)) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: C.sand }}>
      <OrgSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Mobile header */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{ background: C.glass, borderColor: C.border }}
        >
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg hover:bg-stone-100">
            <Menu size={20} style={{ color: C.forest }} />
          </button>
          <span className="text-sm font-bold" style={{ color: C.forest }}>
            {activeOrg?.name || 'Organisation'}
          </span>
          <div style={{ width: 36 }} />
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
