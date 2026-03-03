'use client';

import React from 'react';
import BuyerNavbar from '@/components/utils/BuyerNavbar';
import CartFloatingIcon from '@/components/utils/CartFloating';
import SyncProvider from '@/services/syncProvider';

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SyncProvider />
      <BuyerNavbar />
      <main style={{
        minHeight: 'calc(100vh - 64px)',
        background: '#F9FBF8',
        padding: '16px',
      }} className="md:p-6">
        {children}
      </main>
      <CartFloatingIcon />
    </>
  );
}
