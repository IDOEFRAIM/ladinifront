'use client';

import { useEffect } from 'react';

/**
 * Filet de sécurité dev (2026-08-27) : la PWA (`next-pwa`) est désactivée en
 * développement (voir next.config.ts), mais un service worker enregistré
 * lors d'un test précédent en mode production (ou d'un `npm run build &&
 * next start` local) reste ACTIF dans le navigateur indéfiniment — il
 * continue d'intercepter les fetch avec sa stratégie de cache d'ORIGINE
 * (NetworkFirst/StaleWhileRevalidate) même si `/sw.js` renvoie 404 depuis le
 * serveur dev actuel. Repéré pendant l'enquête sur le spam de
 * `POST /api/delivery/status` : un `GET /sw.js 404` dans les logs serveur
 * signale exactement ce cas (le navigateur vérifie périodiquement les mises
 * à jour d'un SW déjà installé). Ce composant désenregistre systématiquement
 * tout SW existant et vide les caches Workbox en dev, pour ne jamais tester
 * contre un comportement de cache périmé.
 */
export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});

    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key).catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  return null;
}
