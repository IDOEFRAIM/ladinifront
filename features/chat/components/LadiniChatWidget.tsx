'use client';

import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import type { Role } from '@/features/chat/components/widget/chat.types';
import { useLadiniChat } from '@/features/chat/components/widget/useLadiniChat';
import ChatMessageList from '@/features/chat/components/widget/ChatMessageList';
import ChatInputBar from '@/features/chat/components/widget/ChatInputBar';

export default function LadiniChatWidget({
  role,
  position = 'right',
}: {
  role: Role;
  position?: 'left' | 'right';
}) {
  const {
    isOpen, setIsOpen, messages, input, setInput, isSending, isUploadingImage, isLocating, elapsedSeconds,
    scrollRef, fileInputRef, busy, sendMessage, handleKeyDown, handlePickImage, handleImageSelected, handleShareLocation,
  } = useLadiniChat(role);

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

          <ChatMessageList
            messages={messages}
            scrollRef={scrollRef}
            isUploadingImage={isUploadingImage}
            isLocating={isLocating}
            isSending={isSending}
            elapsedSeconds={elapsedSeconds}
          />

          <ChatInputBar
            input={input}
            onInputChange={setInput}
            busy={busy}
            fileInputRef={fileInputRef}
            onImageSelected={handleImageSelected}
            onPickImage={handlePickImage}
            onShareLocation={handleShareLocation}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
          />
        </div>
      )}
    </>
  );
}
