// Layout SERVEUR : il ne fait qu'assembler des composants clients (Navbar, panier, synchro). Un layout 'use client' faisait
// arriver le contenu de la page de façon asynchrone → l'écran de chargement s'affichait avant la page, même pour une page statique.
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
