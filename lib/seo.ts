// lib/seo.ts — constantes et générateurs JSON-LD (schema.org) partagés.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://ladini.tech').replace(/\/$/, '');
export const SITE_NAME = 'Ladini';
export const SITE_DESCRIPTION =
  'Ladini connecte producteurs et acheteurs au Burkina Faso : céréales, légumes, fruits et produits agricoles frais, directement des coopératives, avec livraison.';
export const DEFAULT_OG_IMAGE = '/images/african_farm_hero.jpg';

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Tronque proprement pour une meta description (Google affiche ~155 caractères). */
export function truncate(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icons/icon-512.png'),
    description: SITE_DESCRIPTION,
    areaServed: { '@type': 'Country', name: 'Burkina Faso' },
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'fr-BF',
    publisher: { '@id': `${SITE_URL}/#organization` },
    // Ne déclarer SearchAction que si /catalogue?search= est réellement lu par la page.
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}
