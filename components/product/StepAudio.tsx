'use client';

import React, { useEffect, useState } from 'react';
import { FaMicrophone, FaVolumeMute, FaInfoCircle } from 'react-icons/fa';
import AudioRecorder from '@/components/audio/voiceRecorder';

interface StepAudioProps {
  onRecordingComplete: (blob: Blob | null) => void;
  onNext: () => void;
}

export default function StepAudio({ onRecordingComplete, onNext }: StepAudioProps) {
  const [hasMicrophoneAccess, setHasMicrophoneAccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Vérification automatique du contexte sécurisé (HTTPS ou localhost)
    const isSecure = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    if (!isSecure) {
      setHasMicrophoneAccess(false);
      setErrorMessage("Le navigateur bloque l'accès au micro car la connexion n'est pas sécurisée (HTTPS).");
      return;
    }

    // 2. Vérification de l'état de la permission déjà enregistrée
    navigator.permissions.query({ name: 'microphone' as PermissionName })
      .then((permissionStatus) => {
        if (permissionStatus.state === 'denied') {
          setHasMicrophoneAccess(false);
          setErrorMessage("L'accès au micro semble bloqué dans les réglages de votre navigateur.");
        } else if (permissionStatus.state === 'granted') {
          setHasMicrophoneAccess(true);
        } else {
          // 'prompt' -> On attend que l'utilisateur clique sur le micro pour lui demander
          setHasMicrophoneAccess(true);
        }

        // Écoute les changements si l'utilisateur modifie ses réglages à la volée
        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'denied') {
            setHasMicrophoneAccess(false);
            setErrorMessage("L'accès au micro a été désactivé.");
          } else {
            setHasMicrophoneAccess(true);
            setErrorMessage('');
          }
        };
      })
      .catch(() => {
        // Fallback si l'API permissions.query n'est pas supportée (ex: vieux Safari)
        setHasMicrophoneAccess(true);
      });
  }, []);

  return (
    <div className="flex flex-col items-center space-y-6 animate-in slide-in-from-right-10 duration-300 text-center w-full max-w-sm mx-auto">
      
      {/* ── DESIGN ADAPTATIF : MICROPHONE OU RETOUR SMOOTH ── */}
      {hasMicrophoneAccess === false ? (
        /* État Erreur d'accès soft */
        <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-100 text-slate-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto border border-slate-200">
            <FaVolumeMute size={28} />
          </div>
          
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-start gap-3 text-left">
            <FaInfoCircle size={16} className="text-slate-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Note vocale indisponible</p>
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                {errorMessage || "Impossible d'accéder au micro. Vous pouvez continuer sans enregistrer de voix."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* État Normal fonctionnel */
        <>
          <div 
            className="bg-emerald-50 text-emerald-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm border border-emerald-100/60 transition-all"
            aria-hidden="true"
          >
            <FaMicrophone size={30} className="animate-pulse duration-1000" />
          </div>

          <div className="space-y-1">
            <h3 className="font-black text-xl text-slate-800 uppercase tracking-wide">
              Message Vocal
            </h3>
            <p className="text-xs font-medium text-slate-400 max-w-[280px] mx-auto">
              Ajoutez des précisions orales pour aider vos acheteurs à choisir votre produit.
            </p>
          </div>
        </>
      )}

      {/* ── ZONE DE L'ENREGISTREUR ── */}
      <div className="w-full py-2">
        {hasMicrophoneAccess !== false ? (
          <AudioRecorder onRecordingComplete={onRecordingComplete} />
        ) : (
          <div className="py-4 text-xs font-bold text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200 select-none">
            Annonce textuelle uniquement
          </div>
        )}
      </div>

      {/* ── BOUTON SUIVANT TOUJOURS ACCESSIBLE ── */}
      <button
        type="button"
        onClick={onNext}
        className="w-full bg-emerald-950 hover:bg-emerald-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all cursor-pointer shadow-md select-none active:scale-[0.99]"
      >
        {hasMicrophoneAccess === false ? "Passer cette étape" : "Vérifier l'annonce"}
      </button>
      
    </div>
  );
}