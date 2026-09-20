'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

// Persisté seulement pour "déjà installé" (définitif). Le dismiss d'un utilisateur
// non installé n'est PAS persisté au-delà de la session : tant qu'il n'a pas
// installé l'app, on doit toujours la lui reproposer (première connexion, puis
// les fois suivantes) — c'est la demande explicite, pas un choix arbitraire.
const INSTALLED_KEY = 'ladini_pwa_installed';
const DISMISSED_THIS_SESSION_KEY = 'ladini_pwa_prompt_dismissed_session';
// 8 s : la bannière ne doit pas apparaître pendant le chargement — un élément qui s'affiche après l'hydratation devenait
// l'élément LCP (Largest Contentful Paint) mesuré par Lighthouse/Google et repoussait le LCP de la page.
const SHOW_DELAY_MS = 8000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<'native' | 'ios' | null>(null);

  useEffect(() => {
    let safeToShow = true;
    try {
      if (isStandalone()) {
        localStorage.setItem(INSTALLED_KEY, '1');
        safeToShow = false;
      } else if (localStorage.getItem(INSTALLED_KEY) === '1') {
        safeToShow = false;
      } else if (sessionStorage.getItem(DISMISSED_THIS_SESSION_KEY) === '1') {
        safeToShow = false;
      }
    } catch {
      // Stockage indisponible (navigation privée, etc.) : on retombe sur le
      // comportement par défaut (proposer), plutôt que de bloquer l'install.
    }
    if (!safeToShow) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      timer = setTimeout(() => {
        setMode('native');
        setVisible(true);
      }, SHOW_DELAY_MS);
    };

    const onAppInstalled = () => {
      try {
        localStorage.setItem(INSTALLED_KEY, '1');
      } catch {
        // ignore
      }
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // iOS Safari ne déclenche jamais beforeinstallprompt : on propose l'instruction manuelle.
    if (isIos()) {
      timer = setTimeout(() => {
        setMode('ios');
        setVisible(true);
      }, SHOW_DELAY_MS);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISSED_THIS_SESSION_KEY, '1');
    } catch {
      // ignore
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      try {
        localStorage.setItem(INSTALLED_KEY, '1');
      } catch {
        // ignore
      }
    }
    // Un `beforeinstallprompt` ne se réutilise qu'une fois.
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible || !mode) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:left-auto sm:w-96 z-[60] bg-white rounded-2xl shadow-2xl border border-soft-border p-4 flex items-start gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt="LadiNi"
        width={44}
        height={44}
        className="rounded-xl shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-forest">Installer LadiNi</p>
        {mode === 'native' ? (
          <>
            <p className="text-xs text-slate-600 mt-0.5">
              Accédez plus vite au marché, même avec une connexion instable.
            </p>
            <button
              onClick={handleInstall}
              className="mt-2 inline-flex items-center gap-1.5 bg-forest text-white text-xs font-bold px-3 py-2 rounded-xl hover:brightness-105 transition-all"
            >
              <Download size={14} />
              Installer l&apos;application
            </button>
          </>
        ) : (
          <p className="text-xs text-slate-600 mt-0.5 flex items-center flex-wrap gap-1">
            Appuyez sur <Share size={13} className="inline text-forest" strokeWidth={2.5} />
            puis « Sur l&apos;écran d&apos;accueil » pour installer l&apos;application.
          </p>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Fermer"
        className="p-1 -mt-1 -mr-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
      >
        <X size={18} />
      </button>
    </div>
  );
}
