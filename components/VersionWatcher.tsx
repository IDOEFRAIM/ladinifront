'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BUILD_HEADER, CLIENT_BUILD_ID, isOutdated } from '@/lib/client-version';

const POLL_MS = 5 * 60_000;
const RELOAD_GUARD = 'ladini:chunk-reload';

/** Vide les caches du navigateur puis recharge : garantit que le rechargement récupère le code neuf et non une copie en cache. */
async function hardReload() {
  try {
    if ('serviceWorker' in navigator) (await navigator.serviceWorker.getRegistrations()).forEach((r) => void r.update().catch(() => {}));
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch { /* le rechargement reste utile même si le nettoyage échoue */ }
  window.location.reload();
}

/**
 * Évite les incohérences entre un onglet ouvert sur une ancienne version du site et le backend/la base migrés :
 *  1. chaque appel /api du site envoie sa version (x-app-build) et lit celle du serveur dans la réponse ;
 *  2. la version est aussi interrogée toutes les 5 min et au retour sur l'onglet (/api/version) ;
 *  3. une ancienne version détectée → bandeau « Mettre à jour » (jamais de rechargement pendant une saisie) ;
 *  4. un chunk JS disparu après un déploiement (ChunkLoadError) → un rechargement automatique, une seule fois par onglet.
 */
export default function VersionWatcher() {
  const [outdated, setOutdated] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/version', { cache: 'no-store' });
      const { buildId } = (await res.json()) as { buildId?: string };
      if (isOutdated(CLIENT_BUILD_ID, buildId)) setOutdated(true);
    } catch { /* hors ligne : on réessaiera */ }
  }, []);

  useEffect(() => {
    if (CLIENT_BUILD_ID === 'dev') return;

    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const sameOriginApi = url.startsWith('/api/') || url.startsWith(`${location.origin}/api/`);
      if (!sameOriginApi) return originalFetch(input, init);
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      headers.set(BUILD_HEADER, CLIENT_BUILD_ID);
      const res = await originalFetch(input, { ...init, headers });
      if (isOutdated(CLIENT_BUILD_ID, res.headers.get(BUILD_HEADER))) setOutdated(true);
      return res;
    };

    const onChunkError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const msg = String(('reason' in e ? (e.reason as Error | undefined)?.message : e.message) ?? '');
      if (!/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(msg)) return;
      try {
        if (sessionStorage.getItem(RELOAD_GUARD)) return;
        sessionStorage.setItem(RELOAD_GUARD, '1');
      } catch { return; } // sans sessionStorage : pas de rechargement automatique (risque de boucle)
      void hardReload();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };

    window.addEventListener('error', onChunkError);
    window.addEventListener('unhandledrejection', onChunkError);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => void check(), POLL_MS);
    void check();

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('error', onChunkError);
      window.removeEventListener('unhandledrejection', onChunkError);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [check]);

  if (!outdated) return null;
  return (
    <div role="alert" style={{ position: 'fixed', left: 12, right: 12, bottom: 84, zIndex: 9999, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 16, background: '#064E3B', color: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.25)', fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
      <span>Une nouvelle version de Ladini est disponible.</span>
      <button type="button" onClick={() => void hardReload()} style={{ border: 'none', borderRadius: 100, padding: '8px 16px', background: '#10B981', color: '#fff', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Mettre à jour</button>
    </div>
  );
}
