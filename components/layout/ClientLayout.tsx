'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar'; 
import CartFloatingIcon from '@/components/layout/CartFloating'; 
import { NetworkStatus } from '@/components/ui/NetworkStatus';
import SyncStatusIndicator from '@/components/ui/SyncStatus';

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentPath = pathname ?? '';

  // Liste des chemins où on NE VEUT PAS la Navbar du haut ni le panier
  // Si l'URL commence par /productor, on considère qu'on est dans le dashboard
  const isDashboard = currentPath.startsWith('/productor') || currentPath.startsWith('/dashboard');

  return (
    <>
      {/* 1. Navbar : On ne l'affiche que si on n'est PAS sur le dashboard */}
      {!isDashboard && <Navbar />}

      {/* 2. Indicateurs système (On les garde partout) */}
      <NetworkStatus />
      <SyncStatusIndicator />

      {/* 3. Contenu principal */}
      {/* On ajuste le padding top seulement si la Navbar est là */}
      <main style={{ paddingTop: isDashboard ? '0px' : '80px', minHeight: '85vh' }}> 
        {children}
      </main>
      
      {/* 4. Panier : On ne l'affiche que si on n'est PAS sur le dashboard */}
      {!isDashboard && <CartFloatingIcon /> }
    </>
  );
}