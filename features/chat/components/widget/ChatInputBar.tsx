'use client';

import type { ChangeEventHandler, KeyboardEventHandler, RefObject } from 'react';
import { Send, ImagePlus, MapPin } from 'lucide-react';

interface Props {
  input: string;
  onInputChange: (value: string) => void;
  busy: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onImageSelected: ChangeEventHandler<HTMLInputElement>;
  onPickImage: () => void;
  onShareLocation: () => void;
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onSend: () => void;
}

export default function ChatInputBar({ input, onInputChange, busy, fileInputRef, onImageSelected, onPickImage, onShareLocation, onKeyDown, onSend }: Props) {
  return (
  <div className="flex items-end gap-1.5 p-3 border-t border-soft-border bg-white">
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
      className="hidden"
      onChange={onImageSelected}
    />
    <button
      onClick={onPickImage}
      disabled={busy}
      aria-label="Envoyer une image"
      title="Envoyer une image"
      className="flex items-center justify-center w-9 h-9 rounded-xl text-forest hover:bg-clay disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
    >
      <ImagePlus size={18} />
    </button>
    <button
      onClick={onShareLocation}
      disabled={busy}
      aria-label="Partager ma position"
      title="Partager ma position"
      className="flex items-center justify-center w-9 h-9 rounded-xl text-forest hover:bg-clay disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
    >
      <MapPin size={18} />
    </button>
    <textarea
      value={input}
      onChange={(e) => onInputChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Écrivez votre message..."
      rows={1}
      maxLength={4000}
      className="flex-1 resize-none max-h-24 rounded-xl border border-soft-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
    />
    <button
      onClick={onSend}
      disabled={busy || !input.trim()}
      aria-label="Envoyer"
      className="flex items-center justify-center w-10 h-10 rounded-xl bg-forest text-white disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 transition-all shrink-0"
    >
      <Send size={18} />
    </button>
  </div>
  );
}
