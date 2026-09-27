'use client';

import React from 'react';
import { useSyncEngine } from '@/hooks/useSyncEngine';

export default function SyncStatusIndicator() {
  // Ce hook gère la logique d'envoi en arrière-plan
  const { isSyncing, pendingCount } = useSyncEngine();

  // Si rien à synchroniser, on n'affiche rien
  if (pendingCount === 0 && !isSyncing) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px', // Un peu au-dessus du CartFloatingIcon
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#2D2D2D',
      color: '#fff',
      padding: '8px 16px',
      borderRadius: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 9990, // Juste en dessous du Floating Icon
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '0.85rem',
      fontWeight: '500',
      border: '1px solid #444'
    }}>
      {isSyncing ? (
        <>
          <span className="animate-spin">🔄</span> 
          <span>Envoi en cours...</span>
        </>
      ) : (
        <>
          <span>📡 En attente réseau</span>
          <span style={{
            background: '#A63C06', 
            color: 'white', 
            padding: '2px 8px', 
            borderRadius: '10px', 
            fontSize: '0.75rem'
          }}>
            {pendingCount}
          </span>
        </>
      )}
    </div>
  );
}