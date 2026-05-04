'use client';

import React from 'react';
import BuyerNavbar from '@/components/utils/BuyerNavbar';
import CartFloatingIcon from '@/components/utils/CartFloating';
import SyncProvider from '@/services/syncProvider';
import { AccountTypeGuard, AccountTypeBanner } from '@/components/guards/AccountTypeGuard';
import { BuyerMobileTabBar } from '@/components/ui/MobileTabBar';

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountTypeGuard>
      {/* 
        Le SyncProvider est placé ici pour s'assurer que la synchronisation 
        ne tourne que pour les utilisateurs authentifiés par le Guard. 
      */}
      <SyncProvider />

      {/* NAVBAR — Desktop uniquement */}
      <header className="hidden md:block sticky top-0 z-40 w-full">
        <BuyerNavbar />
      </header>

      {/* BANNER DE TYPE DE COMPTE (Alerte mode test ou rôle) */}
      <div className="w-full px-4 md:px-6 pt-2">
        <AccountTypeBanner />
      </div>

      {/* 
          MAIN CONTENT 
          - pb-24 sur mobile pour ne pas être caché par la TabBar
          - bg-[#F9FBF8] (Sable) pour le confort visuel
      */}
      <main className="min-h-screen bg-[#F9FBF8] transition-colors duration-300">
        <div className="max-w-7xl mx-auto p-4 pb-28 md:p-8">
          {children}
        </div>
      </main>

      {/* CART FLOATING — Visible uniquement sur Desktop (Le mobile utilise la TabBar) */}
      <aside className="hidden md:block">
        <CartFloatingIcon />
      </aside>

      {/* 
          MOBILE TAB BAR 
          - Utilisation de safe-area-inset-bottom pour les iPhone récents (Dynamic Island/Home bar)
      */}
      <footer 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-emerald-900/5 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <BuyerMobileTabBar />
      </footer>
      
    </AccountTypeGuard>
  );
}