// components/monitoring/LiveConnectionIndicator.tsx
// =========================================================
// Indicateur de connexion SSE pour le header
// Affiche l'état de la connexion temps réel
// =========================================================

'use client';

import React from 'react';
import { useMonitoringSSE } from '@/hooks/useAgentMonitor';

interface LiveConnectionIndicatorProps {
  role?: string;
}

export default function LiveConnectionIndicator({ role }: LiveConnectionIndicatorProps) {
  const { isConnected } = useMonitoringSSE(role);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${
        isConnected
          ? 'bg-green-500/10 text-green-600 border-green-500/20'
          : 'bg-red-500/10 text-red-500 border-red-500/20'
      }`}
      title={isConnected ? 'Connecté au flux temps réel' : 'Déconnecté du flux temps réel'}
    >
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </span>
      {isConnected ? 'LIVE' : 'OFFLINE'}
    </div>
  );
}
