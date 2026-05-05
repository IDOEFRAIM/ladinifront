"use client";

import React, { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import DistributionReceiptForm from '@/components/DistributionReceiptForm';
import { ShieldCheck, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

export default function PageClient() {
  const params = useParams() as { id?: string } | null;
  const pathname = usePathname();
  const router = useRouter();
  const id = params?.id;

  const [me, setMe] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  // Récupération de l'utilisateur avec gestion propre de la mémoire
  useEffect(() => {
    const controller = new AbortController();
    
    async function checkUser() {
      try {
        const res = await fetch('/api/me', { 
          signal: controller.signal,
          credentials: 'same-origin' 
        });
        if (res.ok) {
          const data = await res.json();
          setMe(data);
        }
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error("Auth check failed", e);
        }
      } finally {
        setChecking(false);
      }
    }

    checkUser();
    return () => controller.abort();
  }, []);

  // 1. Cas d'erreur : ID manquant
  if (!id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-stone-50">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-stone-900">Distribution introuvable</h2>
        <p className="text-stone-500 mt-2 mb-6">Le lien utilisé semble invalide ou expiré.</p>
        <button onClick={() => router.back()} className="text-emerald-700 font-bold flex items-center gap-2">
          <ArrowLeft size={18} /> Retour
        </button>
      </div>
    );
  }

  // 2. Chargement
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <span className="text-sm text-stone-500 font-medium">Vérification de l'accès...</span>
        </div>
      </div>
    );
  }

  // 3. Authentification requise
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-sm w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} className="text-stone-400" />
          </div>
          <h1 className="text-xl font-black text-stone-900 mb-2">Identification</h1>
          <p className="text-sm text-stone-500 mb-8 leading-relaxed">
            Pour confirmer cette réception, vous devez être connecté à votre compte sécurisé.
          </p>
          <a 
            href={`/login?next=${encodeURIComponent(pathname || '/')}`} 
            className="block w-full py-4 bg-emerald-800 text-white rounded-2xl font-bold text-sm hover:bg-emerald-900 transition-transform active:scale-95"
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  // 4. Interface de confirmation (Le "vrai" dashboard)
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-md mx-auto px-4 py-8">
        
        {/* Navigation de retour */}
        <button 
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-stone-500 hover:text-stone-900 mb-8 transition-colors"
        >
          <div className="p-2 rounded-full bg-white border border-stone-200 group-hover:border-stone-400">
            <ArrowLeft size={16} />
          </div>
          <span className="text-sm font-bold">Retour</span>
        </button>

        {/* Header de l'action */}
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 bg-emerald-100 rounded-2xl">
            <ShieldCheck size={24} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Validation</h1>
            <p className="text-sm text-stone-500">
              Distribution <span className="font-mono text-emerald-700 font-bold">#{id.slice(-6).toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Formulaire de réception */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-1 bg-emerald-600" /> {/* Accent line */}
          <div className="p-6">
            <DistributionReceiptForm distributionId={id} />
          </div>
        </div>

        {/* Note de sécurité */}
        <p className="mt-8 text-center text-[11px] text-stone-400 leading-relaxed uppercase tracking-widest font-bold">
          Action certifiée par le protocole de distribution <br />
          LADINI
        </p>
      </div>
    </div>
  );
}