'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Leaf, Menu, X, LayoutDashboard, LogOut, ArrowRight, User } from 'lucide-react';
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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getUserDashboardPath = () => {
    const role = userRole?.toUpperCase();
    if (role === 'SUPERADMIN' || role === 'ADMIN') return '/admin';
    if (role === 'PRODUCER') return '/dashboard';
    if (role === 'BUYER') return '/buyer-dashboard';
    if (role === 'AGENT') return '/agent/deliveries';
    return '/market';
  };

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
            <div className="bg-gradient-to-br from-emerald-900 to-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-emerald-500/20 group-hover:rotate-3 transition-transform">
               <Image 
                src="/images/logo.jpeg"
                alt="logo ladini"
                width={100}
                height={100}/>
            </div>
            <span className="font-space font-extrabold text-xl tracking-tighter text-emerald-900">
              Ladi<span className="text-emerald-500">Ni</span>
            </span>
          </Link>

          {/* DESKTOP NAV - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-full border border-slate-100">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  pathname === link.href
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link 
                  href={getUserDashboardPath()} 
                  className="hidden sm:flex items-center gap-2 bg-emerald-900 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-emerald-800 transition-all shadow-md shadow-emerald-900/10"
                >
                  <LayoutDashboard size={14} /> <span>Mon Espace</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="hidden md:flex p-2.5 text-slate-400 hover:text-red-500 transition-colors"
                  title="Déconnexion"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-bold text-emerald-900 hover:text-emerald-600 transition-colors">
                  Connexion
                </Link>
                <Link href="/signup" className="flex items-center gap-2 bg-emerald-900 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:shadow-lg transition-all">
                  Rejoindre <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* BTN MOBILE MENU */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="md:hidden p-2 rounded-xl text-emerald-900 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU PANEL with Framer Motion for smooth entry */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-slate-50 overflow-hidden shadow-2xl"
          >
            <div className="px-4 pt-4 pb-8 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 mb-2">Navigation</p>
              
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center px-4 py-3.5 rounded-2xl font-bold transition-all ${
                    pathname === link.href
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              <div className="my-4 border-t border-slate-100" />

              {isAuthenticated ? (
                <div className="grid gap-2">
                  <Link 
                    href={getUserDashboardPath()} 
                    className="flex items-center justify-center gap-3 w-full bg-emerald-900 text-white p-4 rounded-2xl font-bold shadow-lg"
                  >
                    <LayoutDashboard size={20} /> Mon Tableau de Bord
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-3 w-full bg-red-50 text-red-600 p-4 rounded-2xl font-bold transition-colors"
                  >
                    <LogOut size={20} /> Se déconnecter
                  </button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Link 
                    href="/signup" 
                    className="w-full text-center bg-emerald-900 text-white p-4 rounded-2xl font-bold shadow-lg"
                  >
                    Créer un compte
                  </Link>
                  <Link 
                    href="/login" 
                    className="w-full text-center bg-white border border-slate-200 text-emerald-900 p-4 rounded-2xl font-bold"
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