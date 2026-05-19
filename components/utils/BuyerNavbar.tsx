'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Bot, ClipboardList, LayoutDashboard, Store, User } from 'lucide-react';

const BUYER_LINKS = [
  { name: 'Marché', href: '/catalogue', icon: Store },
  { name: 'Dashboard', href: '/buyer-dashboard', icon: LayoutDashboard },
  { name: 'Commandes', href: '/orders', icon: ClipboardList },
  { name: 'Suivi Agent', href: '/conversations', icon: Bot },
];

export default function BuyerNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, userRole, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Gestion du scroll optimisée avec verrou d'état
  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
    };
    
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Erreur de déconnexion :', error);
    }
  };

  // Optimisation de l'affichage du nom de l'utilisateur
  const shortName = useMemo(() => {
    return user?.name?.split(' ')[0] || 'Compte';
  }, [user?.name]);

  return (
    <nav 
      className={`sticky top-0 z-[100] h-18 w-full flex items-center backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border-b ${
        scrolled 
          ? 'bg-white/75 border-emerald-900/10 shadow-sm' 
          : 'bg-white border-emerald-900/5'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 w-full">
        <div className="flex justify-between items-center">

          {/* SECTION DE GAUCHE : LOGO & LIENS */}
          <div className="flex items-center gap-8">
            <Link 
              href="/catalogue" 
              className="flex items-center gap-2.5 no-underline group active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-50 flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.2)] group-hover:rotate-3 transition-transform">
                <Store size={20} className="text-white" />
              </div>
              <span className="font-['Space_Grotesk'] font-800 text-xl tracking-tight text-emerald-950">
                Agri<span className="text-emerald-500">Market</span>
              </span>
            </Link>

            {/* LIENS PRINCIPAUX - DESKTOP */}
            <div className="hidden lg:flex items-center gap-1">
              {BUYER_LINKS.map((link) => {
                const isActive = pathname?.startsWith(link.href);
                return (
                  <Link 
                    key={link.name} 
                    href={link.href} 
                    className={`font-['Inter'] text-xs font-bold no-underline px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-200 ${
                      isActive 
                        ? 'text-emerald-950 bg-emerald-500/10' 
                        : 'text-slate-500 hover:text-emerald-950 hover:bg-emerald-500/5'
                    }`}
                  >
                    <link.icon size={15} className={isActive ? 'opacity-100' : 'opacity-70'} />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* SECTION DE DROITE : ACTIONS UTILISATEUR */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="relative group">
                {/* BOUTON COMPTE DROPDOWN */}
                <button 
                  className="flex items-center gap-2.5 pl-3.5 pr-1.5 py-1.5 rounded-full border border-emerald-900/10 bg-white cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-emerald-500 hover:shadow-md transition-all duration-300"
                  aria-haspopup="true"
                >
                  <span className="font-['Inter'] text-xs font-bold text-emerald-950">
                    {shortName}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/5 flex items-center justify-center border border-emerald-900/10">
                    <User size={16} className="text-emerald-950" />
                  </div>
                </button>

                {/* PANNEAU DROPDOWN (Affichage géré en CSS natif) */}
                <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl border border-emerald-900/10 shadow-[0_15px_45px_rgba(6,78,59,0.12)] p-2 opacity-0 pointer-events-none translate-y-2 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] z-50">
                  
                  <div className="px-3.5 py-3 border-b border-emerald-900/10 mb-1">
                    <p className="m-0 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Connecté en tant que</p>
                    <p className="m-0 text-xs font-bold text-emerald-950 truncate">{userRole || 'Acheteur'}</p>
                  </div>

                  {['ADMIN', 'SUPERADMIN', 'AGENT'].includes(userRole as string) && (
                    <Link 
                      href={['ADMIN', 'SUPERADMIN'].includes(userRole as string) ? '/admin' : '/agent/deliveries'} 
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-['Inter'] text-xs font-semibold text-amber-600 no-underline hover:bg-amber-50/60 transition-colors duration-200"
                    >
                      <LayoutDashboard size={16} /> 
                      <span>Console {userRole === 'AGENT' ? 'Livreur' : 'Admin'}</span>
                    </Link>
                  )}

                  <button 
                    onClick={handleLogout} 
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl border-none bg-transparent cursor-pointer font-['Inter'] text-xs font-semibold text-red-600 hover:bg-red-50/60 transition-colors duration-200"
                  >
                    <LogOut size={16} /> 
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="font-['Inter'] text-xs font-bold text-white no-underline px-6 py-2.5 rounded-full bg-emerald-950 shadow-[0_4px_12px_rgba(6,78,59,0.15)] hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Connexion
              </Link>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}