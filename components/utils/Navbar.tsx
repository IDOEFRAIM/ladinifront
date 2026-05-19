'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, LayoutDashboard, LogOut, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { name: 'Accueil', href: '/' },
  { name: 'Enchères', href: '/auction' },
  { name: 'Catalogue', href: '/catalogue' },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, userRole, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Fermer le menu mobile de manière sécure lors des changements de page
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Écouteur de défilement optimisé (évite les appels d'état redondants en boucle)
  useEffect(() => {
    const handleScroll = () => {
      const shouldScroll = window.scrollY > 20;
      setScrolled((prev) => (prev !== shouldScroll ? shouldScroll : prev));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', error);
    }
  };

  // Optimisation : Calcul du chemin mémoïsé pour empêcher la réévaluation à chaque scroll
  const dashboardPath = useMemo(() => {
    const role = userRole?.toUpperCase();
    switch (role) {
      case 'SUPERADMIN':
      case 'ADMIN':
        return '/admin';
      case 'PRODUCER':
        return '/dashboard';
      case 'BUYER':
        return '/buyer-dashboard';
      case 'AGENT':
        return '/agent/deliveries';
      default:
        return '/market';
    }
  }, [userRole]);

  return (
    <nav
      className={`sticky top-0 z-[100] w-full transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 backdrop-blur-md py-2 shadow-sm border-b border-emerald-900/5' 
          : 'bg-white py-4 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2 group transition-transform active:scale-95">
            <div className="relative bg-gradient-to-br from-emerald-900 to-emerald-500 p-1.5 rounded-xl text-white shadow-lg shadow-emerald-500/20 group-hover:rotate-3 transition-transform overflow-hidden w-11 h-11 flex items-center justify-center">
              <Image 
                src="/images/logo.jpeg"
                alt="Logo LadiNi"
                width={40}
                height={40}
                className="object-contain rounded-lg"
                priority
              />
            </div>
            <span className="font-space font-extrabold text-xl tracking-tighter text-emerald-900">
              Ladi<span className="text-emerald-500">Ni</span>
            </span>
          </Link>

          {/* MENUS DESKTOP */}
          <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-full border border-slate-100">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-slate-500 hover:text-emerald-700'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* BLOC D'ACTIONS */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link 
                  href={dashboardPath} 
                  className="hidden sm:flex items-center gap-2 bg-emerald-900 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-emerald-800 transition-all shadow-md shadow-emerald-900/10"
                >
                  <LayoutDashboard size={14} /> <span>Mon Espace</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="hidden md:flex p-2.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Déconnexion"
                  aria-label="Se déconnecter"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-bold text-emerald-900 hover:text-emerald-600 transition-colors">
                  Connexion
                </Link>
                <Link href="/signup" className="flex items-center gap-2 bg-emerald-900 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-emerald-800 hover:shadow-lg transition-all">
                  Rejoindre <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* BOUTON DU MENU MOBILE */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="md:hidden p-2 rounded-xl text-emerald-900 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation"}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* PANNEAU MOBILE (ANIMATION DROPPING VIA FRAMER MOTION) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden bg-white border-t border-slate-100 overflow-hidden shadow-2xl"
          >
            <div className="px-4 pt-4 pb-8 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 mb-2">Navigation</p>
              
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}

              <div className="my-4 border-t border-slate-100" />

              {isAuthenticated ? (
                <div className="grid gap-2">
                  <Link 
                    href={dashboardPath} 
                    className="flex items-center justify-center gap-3 w-full bg-emerald-900 text-white p-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-800 transition-colors"
                  >
                    <LayoutDashboard size={20} /> Mon Tableau de Bord
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-3 w-full bg-red-50 text-red-600 p-4 rounded-2xl font-bold transition-colors cursor-pointer hover:bg-red-100"
                  >
                    <LogOut size={20} /> Se déconnecter
                  </button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Link 
                    href="/signup" 
                    className="w-full text-center bg-emerald-900 text-white p-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-800 transition-colors"
                  >
                    Créer un compte
                  </Link>
                  <Link 
                    href="/login" 
                    className="w-full text-center bg-white border border-slate-200 text-emerald-900 p-4 rounded-2xl font-bold hover:bg-slate-50 transition-colors"
                  >
                    Se connecter
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
