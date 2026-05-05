import type { Metadata, Viewport } from "next";
import "./globals.css";

import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Ladini — Marché Agricole du Burkina Faso',
  description: 'Plateforme de commerce agricole connectant producteurs et consommateurs au Burkina Faso.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent', // Meilleur look sur iPhone
    title: 'Ladini',
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
      <body className="antialiased min-h-screen bg-slate-50 flex flex-col text-slate-900 overflow-x-hidden">
        <AuthProvider>
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