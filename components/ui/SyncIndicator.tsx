'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useNetwork } from '@/hooks/useNetwork';
import { localDb } from '@/lib/dexie';
import { processSyncQueue } from '@/lib/syncService';

export default function SyncIndicator() {
  const isOnline = useNetwork();

  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const checkQueue = useCallback(async () => {
    if (!localDb) return;
    try {
      const orders = await localDb.offlineOrders
        .where('synced')
        .equals(0)
        .count();
      setPendingCount(orders);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    checkQueue();
    const interval = setInterval(checkQueue, 10000);
    return () => clearInterval(interval);
  }, [checkQueue, isOnline]);

  const handleSync = useCallback(async () => {
    if (pendingCount === 0 || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await processSyncQueue();

      if (result.syncedCount > 0) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 5000);
      }
      await checkQueue();
    } catch {
      // queue preserved for retry
    } finally {
      setIsSyncing(false);
    }
  }, [pendingCount, isSyncing, checkQueue]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      handleSync();
    }
  }, [isOnline, pendingCount, handleSync]);

  if (isOnline && pendingCount === 0 && !syncSuccess && !isSyncing) return null;

  let bgColor = '#92400e'; // amber-800 (offline)
  let icon = '📡';
  let message = 'Mode Hors-ligne';

  if (isSyncing) {
    bgColor = '#166534'; // green-800 (syncing)
    icon = '🔄';
    message = 'Synchronisation…';
  } else if (syncSuccess) {
    bgColor = '#166534';
    icon = '✅';
    message = 'Données envoyées !';
  } else if (!isOnline) {
    bgColor = '#92400e';
    icon = '📡';
    message = `Hors-ligne (${pendingCount} en attente)`;
  }

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className="fixed bottom-5 right-5 z-50 flex cursor-pointer items-center gap-2.5 rounded-full px-5 py-3 font-semibold text-white shadow-lg transition-all"
      style={{ backgroundColor: bgColor }}
    >
      <span className={isSyncing ? 'animate-spin' : ''}>{icon}</span>
      <span>{message}</span>

      {isExpanded && !isOnline && pendingCount > 0 && (
        <span className="ml-2.5 border-l border-white/30 pl-2.5 text-xs">
          Vos commandes sont sauvegardées localement.
        </span>
      )}
    </div>
  );
}