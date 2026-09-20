'use client';

import type { RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/features/chat/components/widget/chat.types';
import { waitingText, renderWithLinks } from '@/features/chat/components/widget/chat.utils';

interface Props {
  messages: ChatMessage[];
  scrollRef: RefObject<HTMLDivElement | null>;
  isUploadingImage: boolean;
  isLocating: boolean;
  isSending: boolean;
  elapsedSeconds: number;
}

export default function ChatMessageList({ messages, scrollRef, isUploadingImage, isLocating, isSending, elapsedSeconds }: Props) {
  return (
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
  );
}
