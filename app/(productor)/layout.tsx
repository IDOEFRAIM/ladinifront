'use client';

import React, { useState, useEffect } from 'react';
import ProductorSidebar from '@/components/utils/productorSidebar';
import { Menu, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function ProductorLayout({ children }: { children: React.ReactNode }) {
  const { userRole, isAuthenticated, isLoading, activeOrg } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showContinueBtn, setShowContinueBtn] = useState(false);

  // Access control — redirect wrong roles to their own dashboard
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    const role = userRole?.toUpperCase();
    if (role === 'AGENT') { router.replace('/agent/deliveries'); return; }
    if (role === 'BUYER' || role === 'USER') { router.replace('/buyer-dashboard'); return; }
  }, [isLoading, isAuthenticated, userRole, router]);

  // Fallback button timer for stuck loading
  useEffect(() => {
    if (!isLoading) { setShowContinueBtn(false); return; }
    const t = setTimeout(() => setShowContinueBtn(true), 4000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FBF8] p-6 text-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <h2 className="text-slate-800 font-semibold text-lg">Vérification de vos accès</h2>
        <p className="text-slate-500 text-sm max-w-xs">Nous préparons votre espace de gestion agricole...</p>
        {showContinueBtn && (
          <button
            onClick={() => router.replace('/login')}
            className="mt-6 flex items-center gap-2 text-amber-600 font-medium text-sm border border-amber-200 px-4 py-2 rounded-full hover:bg-amber-50 transition-colors"
          >
            <AlertCircle size={16} /> Un problème ? Se reconnecter
          </button>
        )}
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-[#F9FBF8] overflow-hidden">
      <ProductorSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* MOBILE HEADER — hidden on desktop (sidebar visible instead) */}
        <header className="md:hidden flex items-center justify-between px-4 h-16 sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-[#064E3B] hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="font-bold text-sm uppercase tracking-wider text-[#064E3B]">
            Espace Producteur
          </h1>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay pour fermer la sidebar sur mobile quand on clique à côté */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}