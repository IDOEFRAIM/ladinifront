'use client';

import React from 'react';
import { WAIT_STAGES } from '@/features/chat/components/widget/chat.constants';

export function waitingText(elapsedSeconds: number): string {
  let text = WAIT_STAGES[0].text;
  for (const stage of WAIT_STAGES) {
    if (elapsedSeconds >= stage.after) text = stage.text;
  }
  return text;
}

export const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function renderWithLinks(text: string) {
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

export function createId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
