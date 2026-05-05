'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Package, History, Menu, X, Truck, 
  ClipboardList, Bell, Home, LogOut, User 
} from 'lucide-react';
import { AgentMobileTabBar } from '@/components/ui/MobileTabBar';

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

  // Fermer le menu mobile si la route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F9FBF8] font-sans text-slate-900">

      {/* HEADER — Mobile & Desktop */}
      <header className="sticky top-0 z-50 bg-[#064E3B] text-white px-4 h-16 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {/* Logo cliquable pour retour rapide accueil console */}
          <Link href="/agent/deliveries" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="bg-emerald-500 p-1.5 rounded-xl shadow-inner">
              <Truck size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-tight text-sm leading-none">FRONTAG</span>
              <span className="text-[10px] font-medium opacity-70 tracking-widest uppercase">Logistique</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          {/* Retour Portail Public (La Boutique) */}
          <Link 
            href="/" 
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-xs font-bold transition-colors border border-white/20"
          >
            <Home size={14} /> Quitter la console
          </Link>

          <button className="relative p-2 hover:bg-white/10 rounded-full transition-colors">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 border-2 border-[#064E3B] rounded-full" />
          </button>

          {/* Menu Hamburger — Mobile uniquement */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </header>

      {/* DESKTOP SIDEBAR / SUB-NAV */}
      <nav className="hidden md:block bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
          <div className="flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = currentPath === href || currentPath.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-bold transition-all border-b-2 ${
                    active
                      ? 'text-emerald-700 border-emerald-700 bg-emerald-50/30'
                      : 'text-slate-500 border-transparent hover:text-emerald-600'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </div>
          
          <Link href="/profile" className="flex items-center gap-2 text-slate-500 hover:text-emerald-700 font-bold text-sm">
            <User size={18} /> Profil
          </Link>
        </div>
      </nav>

      {/* MOBILE OVERLAY MENU */}
      <AnimateMenu isOpen={isMenuOpen}>
        <div className="flex flex-col h-full">
          <div className="flex flex-col gap-2 mt-4">
            <p className="text-emerald-400/50 text-[10px] font-black uppercase tracking-[0.2em] px-2 mb-2">Navigation Logistique</p>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 text-white p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-lg font-bold"
              >
                <Icon size={24} className="text-emerald-400" /> {label}
              </Link>
            ))}
          </div>

          <div className="mt-auto space-y-3 pb-10">
            <div className="h-px bg-white/10 w-full my-6" />
            
            <Link
              href="/"
              className="flex items-center gap-4 text-emerald-100 p-4 rounded-2xl border border-white/10 hover:bg-white/5 transition-colors font-bold"
            >
              <Home size={22} /> Retour à l'accueil client
            </Link>

            <button className="flex items-center gap-4 text-red-300 p-4 w-full font-bold">
              <LogOut size={22} /> Déconnexion
            </button>
          </div>
        </div>
      </AnimateMenu>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-6xl mx-auto p-4 md:p-8 pb-32 md:pb-12">
        {children}
      </main>

      {/* MOBILE TAB BAR (Bas de l'écran) */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-200 pb-safe">
        <AgentMobileTabBar />
      </footer>
    </div>
  );
}

// Petit composant helper pour l'animation simple du menu mobile
function AnimateMenu({ isOpen, children }: { isOpen: boolean, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="md:hidden fixed inset-0 z-[60] bg-[#064E3B] p-6 pt-20 animate-in fade-in slide-in-from-top-4 duration-200">
      {children}
    </div>
  );
}