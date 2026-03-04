'use client';

import { useEffect, useState } from 'react';
import { useNetwork } from './useNetwork'; 
import { processSyncQueue } from '@/lib/syncService'; // On pointe vers ton nouveau service
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/dexie'; // Utilisation de localDb au lieu de db

export function useSyncEngine() {
  const isOnline = useNetwork();
  const [isSyncing, setIsSyncing] = useState(false);
  const isDev = process.env.NODE_ENV !== 'production';

  // 1. SURVEILLANCE DES COMMANDES EN ATTENTE
  // useLiveQuery est parfait pour mettre à jour l'UI dès qu'une commande est ajoutée
  const pendingCount = useLiveQuery(
    async () => {
      if (!localDb) return 0;
      // On utilise l'index 'synced'. 0 = false (non synchronisé)
      return await localDb.offlineOrders.where('synced').equals(0).count();
    },
    [] // Dépendances vides pour ce query interne
  ) ?? 0;

  // 2. LOGIQUE DE SYNCHRONISATION AUTOMATIQUE
  useEffect(() => {
    // Ne rien faire si on est offline ou déjà en cours de synchro
    if (!isOnline || isSyncing) return;

    const runSync = async () => {
      if (!localDb) return;

      try {
        // Vérification rapide avant de lancer le service
        const count = await localDb.offlineOrders.where('synced').equals(0).count();
        
        if (count > 0) {
          setIsSyncing(true);
          
          // Appel du service qui traite la file d'attente
          const result = await processSyncQueue();
          
          if (result.syncedCount > 0) {
            if (isDev) console.log(`🚀 Moteur de Synchro : ${result.syncedCount} commandes traitées.`);
          }

          if (result.errors > 0) {
            if (isDev) console.warn(`⚠️ Moteur de Synchro : ${result.errors} échecs.`);
          }
        }
      } catch (err) {
        console.error("❌ Erreur critique dans le moteur de synchro:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    runSync();

    // L'effet se déclenche quand la connexion revient (isOnline) 
    // ou quand une nouvelle commande arrive en local (pendingCount)
  }, [isOnline, pendingCount, isSyncing]); 

  return { isSyncing, pendingCount };
}