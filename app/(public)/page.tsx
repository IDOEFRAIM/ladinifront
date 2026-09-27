// app/(public)/page.tsx — Ladini, marché agricole du Burkina Faso.
// Server Component : le HTML complet (H1, sections, liens) est envoyé aux robots.
// L'interactivité est isolée dans components/home/* (Reveal, PartnersCarousel, MarketFlowSvg).
import type { Metadata } from 'next';
import { C } from '@/components/home/tokens';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import {
  HomeBackground, HeroSection, AIAgentSection, KPIStrip, ProducersSection,
  MarketFlowSection, ValuesSection, PartnersSection, FinalCTASection,
} from '@/components/home/sections';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  // `absolute` : la page d'accueil ne reprend pas le template « %s | Ladini ».
  title: { absolute: 'Ladini — Marché agricole direct au Burkina Faso | Producteurs & acheteurs' },
  description:
    "Ladini met en relation producteurs, coopératives et acheteurs au Burkina Faso : céréales, légumes, produits laitiers et transformés, sans intermédiaire, avec paiement direct et livraison.",
  alternates: { canonical: '/' },
  // Next fusionne les métadonnées de façon superficielle : openGraph de la page REMPLACE celui du layout,
  // il faut donc y répéter les champs à conserver (type, siteName, images).
  openGraph: {
    type: 'website',
    siteName: 'Ladini',
    locale: 'fr_BF',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'Ladini — producteurs et acheteurs au Burkina Faso' }],
    url: '/',
    title: 'Ladini — Marché agricole direct au Burkina Faso',
    description: 'Achetez et vendez des produits agricoles locaux, directement entre producteurs et acheteurs.',
  },
};

export default function HomePage() {
  return (
    <div style={{ background: C.sand, minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
      <HomeBackground />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <HeroSection />
        <AIAgentSection />
        <KPIStrip />
        <ProducersSection />
        <MarketFlowSection />
        <ValuesSection />
        <PartnersSection />
        <FinalCTASection />
        <Footer />
      </div>
    </div>
  );
}
