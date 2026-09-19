'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, Loader2, ImagePlus, MapPin } from 'lucide-react';

type Role = 'producer' | 'buyer';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  imageUrl?: string;
}

const WELCOME_TEXT: Record<Role, string> = {
  producer:
    "Bonjour ! Je suis l'assistant Ladini. Posez-moi vos questions sur vos commandes, votre stock ou vos clients — c'est la même conversation que sur WhatsApp.",
  buyer:
    "Bonjour ! Je suis l'assistant Ladini. Dites-moi ce que vous cherchez (produits, commandes, livraisons) — c'est la même conversation que sur WhatsApp.",
};

// L'agent peut enchaîner plusieurs appels LLM/outils avant de répondre (jusqu'à ~45s,
// voir lib/ladini-chat.ts) : on fait défiler des messages d'attente par palier de temps
// écoulé plutôt qu'un simple "..." statique, pour que l'attente reste rassurante.
const WAIT_STAGES: { after: number; text: string }[] = [
  { after: 0, text: "en train d'écrire..." },
  { after: 4, text: "L'assistant réfléchit à votre demande..." },
  { after: 10, text: 'Recherche des informations en cours...' },
  { after: 18, text: 'Toujours en cours — plusieurs vérifications sont nécessaires...' },
  { after: 30, text: 'Cela prend un peu plus de temps que prévu, merci de patienter...' },
  { after: 45, text: 'Presque terminé, encore un instant...' },
];

function waitingText(elapsedSeconds: number): string {
  let text = WAIT_STAGES[0].text;
  for (const stage of WAIT_STAGES) {
    if (elapsedSeconds >= stage.after) text = stage.text;
  }
  return text;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderWithLinks(text: string) {
  // Le regex capturant fait que split() renvoie [texte, url, texte, url, ...] :
  // les index impairs sont toujours les URLs matchées (éviter .test() sur un
  // regex global réutilisé, dont le lastIndex mutable fausserait le résultat).
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function LadiniChatWidget({
  role,
  position = 'right',
}: {
  role: Role;
  position?: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = isSending || isUploadingImage || isLocating;

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ id: createId(), sender: 'system', text: WELCOME_TEXT[role] }]);
    }
  }, [isOpen, messages.length, role]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending, isUploadingImage]);

  // Palier d'attente : redémarre à chaque nouvel envoi, s'arrête dès que la réponse arrive.
  useEffect(() => {
    if (!isSending) return;
    setElapsedSeconds(0);
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isSending]);

  const pushSystem = (text: string) => {
    setMessages((prev) => [...prev, { id: createId(), sender: 'system', text }]);
  };

  const runExchange = async (userMessage: ChatMessage, payloadText: string) => {
    if (busy) return;
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    try {
      const res = await fetch(`/api/chat/${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: payloadText }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "L'assistant est momentanément indisponible.");
      }

      setMessages((prev) => [
        ...prev,
        { id: createId(), sender: 'agent', text: data.reply || '...' },
      ]);
    } catch (err) {
      pushSystem(err instanceof Error ? err.message : "L'assistant est momentanément indisponible.");
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    runExchange({ id: createId(), sender: 'user', text }, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePickImage = () => {
    if (busy) return;
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      pushSystem('Seules les images sont acceptées.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      pushSystem('Image trop volumineuse (5 Mo max).');
      return;
    }

    setIsUploadingImage(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/chat/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Échec de l'envoi de l'image.");

      setIsUploadingImage(false);
      await runExchange(
        { id: createId(), sender: 'user', text: '', imageUrl: data.url },
        `Voici une photo : ${data.url}`
      );
    } catch (err) {
      setIsUploadingImage(false);
      pushSystem(err instanceof Error ? err.message : "Échec de l'envoi de l'image.");
    }
  };

  const handleShareLocation = () => {
    if (busy) return;
    if (!('geolocation' in navigator)) {
      pushSystem("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        const text = `📍 Ma position actuelle : ${mapsUrl} (précision ±${Math.round(accuracy)} m)`;
        await runExchange({ id: createId(), sender: 'user', text }, text);
      },
      (err) => {
        setIsLocating(false);
        const text =
          err.code === err.PERMISSION_DENIED
            ? 'Vous avez refusé le partage de votre position.'
            : "Impossible d'obtenir votre position pour le moment.";
        pushSystem(text);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const sideClass = position === 'left' ? 'left-6' : 'right-6';

  return (
    <>
      {/* BOUTON FLOTTANT */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Ouvrir le chat Ladini"
          className={`fixed bottom-24 ${sideClass} z-40 flex items-center justify-center w-14 h-14 rounded-full bg-forest text-white shadow-[0_10px_25px_rgba(6,78,59,0.3)] transition-transform hover:scale-105`}
        >
          <MessageCircle size={26} />
        </button>
      )}

      {/* PANNEAU DE CHAT */}
      {isOpen && (
        <div
          className={`fixed bottom-24 ${sideClass} z-50 flex flex-col w-[calc(100vw-2rem)] max-w-sm h-[70vh] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-soft-border overflow-hidden`}
        >
          {/* EN-TÊTE */}
          <div className="flex items-center justify-between px-4 py-3 bg-forest text-white">
            <div>
              <p className="font-bold text-sm">Assistant Ladini</p>
              <p className="text-[11px] text-white/70">Même conversation que sur WhatsApp</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Fermer le chat"
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* MESSAGES */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-[#F9FBF8]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-forest text-white rounded-br-sm'
                      : m.sender === 'system'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-white text-slate-800 border border-soft-border rounded-bl-sm'
                  }`}
                >
                  {m.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageUrl}
                      alt="Photo envoyée"
                      className="rounded-lg max-w-full max-h-48 object-cover mb-1"
                    />
                  )}
                  {m.text && (m.sender === 'user' ? m.text : renderWithLinks(m.text))}
                </div>
              </div>
            ))}
            {isUploadingImage && (
              <div className="flex justify-end">
                <div className="flex items-center gap-2 rounded-2xl rounded-br-sm px-3 py-2 text-sm bg-forest/80 text-white">
                  <Loader2 size={14} className="animate-spin" />
                  Envoi de l&apos;image...
                </div>
              </div>
            )}
            {isLocating && (
              <div className="flex justify-end">
                <div className="flex items-center gap-2 rounded-2xl rounded-br-sm px-3 py-2 text-sm bg-forest/80 text-white">
                  <Loader2 size={14} className="animate-spin" />
                  Localisation en cours...
                </div>
              </div>
            )}
            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm px-3 py-2 text-sm bg-white border border-soft-border text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  {waitingText(elapsedSeconds)}
                </div>
              </div>
            )}
          </div>

          {/* SAISIE */}
          <div className="flex items-end gap-1.5 p-3 border-t border-soft-border bg-white">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelected}
            />
            <button
              onClick={handlePickImage}
              disabled={busy}
              aria-label="Envoyer une image"
              title="Envoyer une image"
              className="flex items-center justify-center w-9 h-9 rounded-xl text-forest hover:bg-clay disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <ImagePlus size={18} />
            </button>
            <button
              onClick={handleShareLocation}
              disabled={busy}
              aria-label="Partager ma position"
              title="Partager ma position"
              className="flex items-center justify-center w-9 h-9 rounded-xl text-forest hover:bg-clay disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <MapPin size={18} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez votre message..."
              rows={1}
              maxLength={4000}
              className="flex-1 resize-none max-h-24 rounded-xl border border-soft-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
            <button
              onClick={sendMessage}
              disabled={busy || !input.trim()}
              aria-label="Envoyer"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-forest text-white disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 transition-all shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
