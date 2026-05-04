'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, History, Menu, X, Truck, ClipboardList, Bell } from 'lucide-react';
import { AgentMobileTabBar } from '@/components/ui/MobileTabBar';

// On utilise Tailwind pour tout, c'est plus propre pour l'agent
const NAV_ITEMS = [
  { href: '/agent/deliveries', label: 'Missions dispo', icon: Truck },
  { href: '/agent/deliveries/active', label: 'En cours', icon: ClipboardList },
  { href: '/agent/distributions', label: 'Distributions', icon: Package },
  { href: '/agent/history', label: 'Historique', icon: History },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentPath = pathname ?? '';

  return (
    <div className="min-h-screen bg-[#F9FBF8] font-sans">

      {/* HEADER — always visible, all breakpoints */}
      <header className="sticky top-0 z-40 bg-[#064E3B] text-white px-4 h-16 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-1.5 rounded-lg">
            <Truck size={20} className="text-white" />
          </div>
          <span className="font-bold tracking-tight text-lg">
            FrontAg <span className="font-light opacity-80">Logistique</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-2 hover:bg-white/10 rounded-full transition-colors" aria-label="Notifications">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#064E3B] rounded-full" />
          </button>
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Ouvrir le menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* DESKTOP NAV — hidden on mobile */}
      <nav className="hidden md:block bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-5xl mx-auto flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = currentPath === href || currentPath.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 ${
                  active
                    ? 'text-emerald-600 border-emerald-600 bg-emerald-50/30'
                    : 'text-slate-600 border-transparent hover:text-emerald-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* MOBILE FULLSCREEN MENU — overlays on top when open */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#064E3B] p-6">
          <div className="flex justify-end mb-8">
            <button onClick={() => setIsMenuOpen(false)} aria-label="Fermer le menu">
              <X size={32} className="text-white" />
            </button>
          </div>
          <nav className="flex flex-col gap-6">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-4 text-white text-xl font-semibold"
              >
                <Icon size={28} /> {label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* MAIN CONTENT — pb-24 on mobile for TabBar */}
      <main className="max-w-5xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* MOBILE TAB BAR — mobile only, fixed bottom */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <AgentMobileTabBar />
      </footer>
    </div>
  );
}