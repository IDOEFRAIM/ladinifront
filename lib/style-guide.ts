/**
 * DESIGN SYSTEM — AgriConnect
 * Esthétique "Agri-Tech Moderne" : sobre, institutionnel, lisible en extérieur.
 * Tons terreux, verts profonds, typographie robuste, contraste élevé.
 */

export const themeConfig = {
  colors: {
    primary: {
      DEFAULT: '#064E3B',   // Vert Émeraude profond (texte principal)
      light: '#E6F5EE',     // Vert pâle (fonds subtils)
      dark: '#053826',      // Vert très foncé
    },
    secondary: {
      DEFAULT: '#D97706',   // Ambre Doré (accent chaud)
      light: '#FDE8B5',     // Ambre pâle (highlights)
      muted: '#A75B08',     // Ambre foncé
    },
    earth: {
      sand: '#F9FBF8',      // Blanc cassé (background principal)
      clay: 'rgba(6,78,59,0.08)',      // Bordures douces
      savanna: '#FFF8E1',   // Accent clair pour surfaces
    },
    status: {
      success: '#10B981',
      warning: '#D97706',
      danger: '#DC2626',
      info: '#0EA5E9',
    },
  },
  borderRadius: {
    card: '32px',
    button: '100px',
    input: '12px',
  },
  typography: {
    fontFamily: {
      sans: ['"Inter"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
    },
  }
};

export const StyleGuide = {
  components: {
    card: "bg-[var(--background)] rounded-[32px] border border-[var(--border)] shadow-sm",
    cardHover: "bg-[var(--background)] rounded-[32px] border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow duration-200",
    button: {
      primary: "bg-[var(--foreground)] text-white py-3 px-6 rounded-[100px] text-sm font-bold hover:brightness-105 transition-all",
      secondary: "bg-white text-[var(--foreground)] py-3 px-6 rounded-[100px] text-sm font-bold border border-[var(--border)] hover:shadow-sm transition-all",
      danger: "bg-[var(--danger,#dc2626)] text-white py-2.5 px-5 rounded-lg text-sm font-bold hover:brightness-95 transition-colors",
      icon: "p-2 rounded-lg hover:bg-[rgba(0,0,0,0.04)] transition-colors",
    },
    badge: {
      success: "bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-md",
      warning: "bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-md",
      danger: "bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-md",
      info: "bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-md",
      neutral: "bg-stone-100 text-stone-700 text-xs font-bold px-2.5 py-1 rounded-md",
    },
    text: {
      hero: "text-3xl md:text-4xl font-extrabold text-stone-900 tracking-tight",
      title: "text-xl font-bold text-stone-900",
      subtitle: "text-base font-semibold text-stone-600",
      label: "text-xs font-bold text-stone-500 uppercase tracking-wide",
      body: "text-sm text-stone-700 leading-relaxed",
    },
    input: "w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors",
  }
};
