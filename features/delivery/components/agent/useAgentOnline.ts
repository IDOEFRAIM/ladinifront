'use client';

import { useState, useEffect, useRef } from 'react';

/** Statut en ligne / pause de l'agent : passage en ligne automatique au montage (une seule fois) et bascule manuelle. */
export function useAgentOnline(toggleOnline: (online: boolean) => Promise<boolean>, refreshPool: () => void) {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [toggling, setToggling] = useState<boolean>(false);

  // ── Effet 1 : Initialisation du statut de l'agent ─────────────────
  // `initRanRef` : garde-fou en profondeur (2026-08-27) — même avec
  // `toggleOnline`/`refreshPool` désormais stables (useCallback dans le
  // hook), on s'assure ici qu'un GO_ONLINE automatique ne peut JAMAIS
  // partir plus d'une fois par montage, quelle que soit une future
  // régression de stabilité des dépendances de cet effet.
  const initRanRef = useRef(false);
  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;
    let alive = true;

    const initStatus = async () => {
      const ok = await toggleOnline(true);
      if (alive && ok) {
        setIsOnline(true);
        refreshPool();
      }
    };

    initStatus();
    return () => { alive = false; };
  }, [toggleOnline, refreshPool]);

  // Note (2026-08-27) : le polling du pool (15s) est déjà géré en interne par
  // `useDeliveryPool` (voir hooks/useDeliveryPool.ts), avec son propre
  // `clearInterval` au démontage. Un second `setInterval` ici dupliquait
  // l'appel réseau à chaque tick (deux `refreshPool()` au lieu d'un) — retiré
  // plutôt que de maintenir deux minuteries qui se chevauchent.

  // ── Handler : Switch Statut (En ligne / Pause) ────────────────────
  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    
    const nextState = !isOnline;
    const ok = await toggleOnline(nextState);
    
    if (ok) {
      setIsOnline(nextState);
      if (nextState) refreshPool();
    }
    setToggling(false);
  };

  return { isOnline, toggling, handleToggle };
}
