import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./home.css";
import "./fonts.css";

import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/features/checkout/context/CartContext';
import { Toaster } from 'react-hot-toast';
import { DevServiceWorkerCleanup } from '@/components/DevServiceWorkerCleanup';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import JsonLd from '@/components/seo/JsonLd';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE, organizationJsonLd, websiteJsonLd } from '@/lib/seo';


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Ladini — Marché agricole du Burkina Faso',
    template: '%s | Ladini',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  publisher: 'Ladini SARL',
  authors: [{ name: 'Ladini SARL', url: SITE_URL }],
  keywords: ['marché agricole Burkina Faso', 'produits agricoles', 'acheter céréales Ouagadougou', 'coopératives agricoles', 'légumes frais Burkina', 'Ladini'],
  alternates: { canonical: '/' }, // les pages enfants surchargent avec leur propre canonical
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'fr_BF',
    url: '/',
    title: 'Ladini — Marché agricole du Burkina Faso',
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'Ladini — producteurs et acheteurs au Burkina Faso' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ladini — Marché agricole du Burkina Faso',
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  // Token fourni par Search Console (méthode « balise HTML ») ; ignoré s'il est absent.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  // App Router manifest route (app/manifest.ts)
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent', // Meilleur look sur iPhone
    title: 'Ladini',
  },
  other: {
    'facebook-domain-verification': '5myi9o3b0lwuxb2ia1pcst4ypx12s9',
  },
};

export const viewport: Viewport = {
  themeColor: '#166534', // Vert forêt
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Évite le zoom auto sur les inputs en mobile
  viewportFit: 'cover', // Utilise tout l'écran (encoches incluses)
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <head>
        {/* Polices auto-hébergées (app/fonts.css) : plus de feuille de style bloquante vers fonts.googleapis.com.
            On précharge uniquement les sous-ensembles « latin » réellement utilisés au premier affichage. */}
        <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 flex flex-col text-slate-900 overflow-x-hidden">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <AuthProvider>
          <DevServiceWorkerCleanup />
          <InstallPrompt />
          <CartProvider>
            {/* Toaster optimisé pour mobile (en bas sur mobile pour être accessible au pouce) */}
            <Toaster 
              position="top-center"
              toastOptions={{
                className: 'text-sm font-medium shadow-xl border border-slate-100 rounded-2xl',
                duration: 4000,
              }} 
            />
    
            {/* Conteneur principal avec padding adaptatif */}
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-safe">
              {children}
            </main>

            {/* Navigation mobile (facultatif si tu en as une) */}
            {/* <MobileNavBar /> */}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}