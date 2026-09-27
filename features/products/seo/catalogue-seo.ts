import type { Metadata } from 'next';
import { breadcrumbJsonLd, DEFAULT_OG_IMAGE } from '@/lib/seo';

export const catalogueMetadata: Metadata = {
  title: 'Catalogue des produits agricoles',
  description:
    'Parcourez le catalogue Ladini : céréales, légumes, fruits et produits agricoles du Burkina Faso, directement auprès des producteurs et coopératives.',
  alternates: { canonical: '/catalogue' },
  openGraph: {
    title: 'Catalogue des produits agricoles | Ladini',
    url: '/catalogue',
    type: 'website',
    siteName: 'Ladini',
    images: [DEFAULT_OG_IMAGE],
  },
};

export function catalogueBreadcrumbJsonLd() {
  return breadcrumbJsonLd([
    { name: 'Accueil', path: '/' },
    { name: 'Catalogue', path: '/catalogue' },
  ]);
}
