import { Role } from '@/features/chat/components/widget/chat.types';

export const WELCOME_TEXT: Record<Role, string> = {
  producer:
    "Bonjour ! Je suis l'assistant Ladini. Posez-moi vos questions sur vos commandes, votre stock ou vos clients — c'est la même conversation que sur WhatsApp.",
  buyer:
    "Bonjour ! Je suis l'assistant Ladini. Dites-moi ce que vous cherchez (produits, commandes, livraisons) — c'est la même conversation que sur WhatsApp.",
};

// L'agent peut enchaîner plusieurs appels LLM/outils avant de répondre (jusqu'à ~45s,
// voir lib/ladini-chat.ts) : on fait défiler des messages d'attente par palier de temps
// écoulé plutôt qu'un simple "..." statique, pour que l'attente reste rassurante.
export const WAIT_STAGES: { after: number; text: string }[] = [
  { after: 0, text: "en train d'écrire..." },
  { after: 4, text: "L'assistant réfléchit à votre demande..." },
  { after: 10, text: 'Recherche des informations en cours...' },
  { after: 18, text: 'Toujours en cours — plusieurs vérifications sont nécessaires...' },
  { after: 30, text: 'Cela prend un peu plus de temps que prévu, merci de patienter...' },
  { after: 45, text: 'Presque terminé, encore un instant...' },
];
