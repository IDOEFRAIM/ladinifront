import type { Metadata, Viewport } from "next";
// Removed next/font/google imports to avoid runtime export issues in this environment.
import "./globals.css";

import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'react-hot-toast';

// Use system fonts / CSS fallbacks for now; font loading can be reintroduced later.

export const metadata: Metadata = {
  title: 'Ladini — Marché Agricole du Burkina Faso',
  description: 'Plateforme de commerce agricole connectant producteurs et consommateurs au Burkina Faso.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FrontAg',
  },
};

export const viewport: Viewport = {
  themeColor: '#166534',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr"> 
      <body className={`antialiased`}>
        <AuthProvider>
          <CartProvider>
            <Toaster position="top-center" />
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}