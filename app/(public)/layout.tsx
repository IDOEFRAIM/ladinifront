'use client';

import React from 'react';
import Navbar from '@/components/utils/Navbar';
import CartFloatingIcon from '@/components/utils/CartFloating';
import SyncProvider from '@/services/syncProvider';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SyncProvider />
      <Navbar />
      <main style={{
        minHeight: 'calc(100vh - 64px)',
        background: '#F9FBF8',
      }}>
        {children}
      </main>
      <CartFloatingIcon />
    </>
  );
}
