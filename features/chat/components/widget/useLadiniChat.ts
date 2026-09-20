'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Role, ChatMessage } from '@/features/chat/components/widget/chat.types';
import { WELCOME_TEXT } from '@/features/chat/components/widget/chat.constants';
import { createId } from '@/features/chat/components/widget/chat.utils';
import { MAX_INPUT_BYTES, compressToJpegBase64 } from '@/features/chat/components/widget/image-compress';

/** État et actions du chat Ladini : envoi texte / photo (base64) / position, messages d'attente et défilement. */
export function useLadiniChat(role: Role) {
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

  const runExchange = async (
    userMessage: ChatMessage,
    payload: { message: string; image_base64?: string; image_mime?: string }
  ) => {
    if (busy) return;
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    try {
      const res = await fetch(`/api/chat/${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 413) throw new Error('Image trop volumineuse. Essayez une photo plus légère.');
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
    runExchange({ id: createId(), sender: 'user', text }, { message: text });
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

    if (file.size > MAX_INPUT_BYTES) {
      pushSystem('Image trop volumineuse (25 Mo max).');
      return;
    }

    setIsUploadingImage(true);
    let base64: string;
    try {
      base64 = await compressToJpegBase64(file);
    } catch (err) {
      setIsUploadingImage(false);
      pushSystem(err instanceof Error ? err.message : "Impossible de préparer l'image.");
      return;
    }
    setIsUploadingImage(false);

    // Miniature locale dans le chat ; la réponse `reply` de l'agent s'affiche ensuite.
    const imageUrl = `data:image/jpeg;base64,${base64}`;
    await runExchange(
      { id: createId(), sender: 'user', text: '', imageUrl },
      { message: '', image_base64: base64, image_mime: 'image/jpeg' }
    );
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
        await runExchange({ id: createId(), sender: 'user', text }, { message: text });
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

  return {
    isOpen, setIsOpen, messages, input, setInput, isSending, isUploadingImage, isLocating, elapsedSeconds,
    scrollRef, fileInputRef, busy, sendMessage, handleKeyDown, handlePickImage, handleImageSelected, handleShareLocation,
  };
}
