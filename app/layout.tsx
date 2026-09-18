import type { Metadata, Viewport } from "next";
import "./globals.css";

import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'react-hot-toast';
import { DevServiceWorkerCleanup } from '@/components/DevServiceWorkerCleanup';


export const metadata: Metadata = {
  title: 'Ladini — Marché Agricole du Burkina Faso',
  description: 'Plateforme connectant producteurs et consommateurs au Burkina Faso.',
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
        {/* Déplacé depuis un @import dans globals.css : un <link> en tête de document est
            découvert par le navigateur immédiatement (en parallèle du CSS), alors qu'un
            @import d'URL externe n'est trouvé qu'après téléchargement du fichier CSS qui le
            contient — PageSpeed mesurait ~750ms de retard evitable sur ce fetch. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" />
      </head>
      <body className="antialiased min-h-screen bg-slate-50 flex flex-col text-slate-900 overflow-x-hidden">
        <AuthProvider>
          <DevServiceWorkerCleanup />
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