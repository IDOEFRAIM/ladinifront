'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/utils/Navbar'; 
import CartFloatingIcon from '@/components/utils/CartFloating'; 
import { NetworkStatus } from '@/components/system/networkStatus';
import SyncStatusIndicator from '@/components/system/syncStatus';

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Liste des chemins où on NE VEUT PAS la Navbar du haut ni le panier
  // Si l'URL commence par /productor, on considère qu'on est dans le dashboard
  const isDashboard = pathname.startsWith('/productor') || pathname.startsWith('/dashboard');

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