/** Constantes partagées côté client (les modules `../conversations` etc. importent la base : jamais depuis un composant client). */
export const SESSION_STATUS_LIST = ['ACTIVE', 'WAITING_USER', 'STALLED', 'COMPLETED', 'CLARIFICATION', 'BLOCKED', 'ERROR', 'HUMAN_REQUIRED', 'ABANDONED'] as const;

export const TABS = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'conversations', label: 'Conversations' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'tools', label: 'Outils' },
  { id: 'performance', label: 'Performance' },
  { id: 'business', label: 'Business' },
  { id: 'health', label: 'Santé' },
] as const;
export type TabId = (typeof TABS)[number]['id'];
