'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import CartFloatingIcon from '@/components/layout/CartFloating';
import SyncProvider from '@/components/providers/SyncProvider';

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
