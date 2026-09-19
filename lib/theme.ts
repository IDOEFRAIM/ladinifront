// lib/theme.ts
// Jetons de design partagés — extraits de app/(public)/page.tsx (la page d'accueil,
// référence visuelle du produit). Toute zone authentifiée (dashboards, etc.) doit
// utiliser CES tokens plutôt qu'une palette/police ad hoc, pour que l'app ne
// ressemble pas à deux produits différents selon l'écran.
export const THEME_COLORS = {
  forest: '#064E3B',
  emerald: '#10B981',
  lime: '#84CC16',
  amber: '#D97706',
  sand: '#F9FBF8',
  white: '#FFFFFF',
  text: '#1F2937',
  muted: '#64748B',
  border: 'rgba(6, 78, 59, 0.07)',
  glass: 'rgba(255, 255, 255, 0.72)',
  glassBold: 'rgba(255, 255, 255, 0.88)',
  statGreen: '#10B981',
  statBlue: '#3B82F6',
  statAmber: '#F59E0B',
  statRose: '#F43F5E',
  danger: '#EF4444',
} as const;

export const THEME_FONTS = {
  heading: "'Space Grotesk', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;
