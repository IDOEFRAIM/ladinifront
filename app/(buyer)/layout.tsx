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
      <SyncProvider />

      {/* NAVBAR — desktop only (hidden on mobile to avoid conflict with TabBar) */}
      <header className="hidden md:block sticky top-0 z-40">
        <BuyerNavbar />
      </header>

      {/* 
          BANNER DE TYPE DE COMPTE :
          Ajustement du padding pour ne pas être collé au bord
      */}
      <AccountTypeBanner />

      {/* MAIN — pb-24 on mobile (space for TabBar), normal on desktop */}
      <main className="min-h-[calc(100vh-64px)] bg-[#F9FBF8] p-4 pb-24 md:p-6 md:pb-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* CART FLOATING — hidden on mobile (TabBar has Panier), visible on desktop */}
      <div className="hidden md:block">
        <CartFloatingIcon />
      </div>

      {/* MOBILE TAB BAR — mobile only, fixed bottom */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <BuyerMobileTabBar />
      </footer>
      
    </AccountTypeGuard>
  );
}