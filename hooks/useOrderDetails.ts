'use client';

import { useState, useEffect } from 'react';
import { getOrderDetails as getServerOrder } from '@/services/orders.service';
import { localDb } from '@/lib/dexie';

export function useOrderDetails(orderId: string) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        
        // 1. Priorité au Serveur (Prisma 7)
        const serverData = await getServerOrder(orderId);
        
        if (serverData) {
          setOrder(serverData);
          setIsOffline(false);
        } else if (localDb) {
          // 2. Fallback Dexie 7 si pas de réponse serveur ou utilisateur offline
          // On tente le cast en nombre pour Dexie, sinon on utilise la string
          const idToSearch = isNaN(Number(orderId)) ? orderId : Number(orderId);
          const localData = await localDb.offlineOrders.get(idToSearch as any);
          
          if (localData) {
            setOrder(localData);
            setIsOffline(true);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la récupération de la commande:", err);
      } finally {
        setLoading(false);
      }
    }

    if (orderId) fetchOrder();
  }, [orderId]);

  return { order, loading, isOffline };
}