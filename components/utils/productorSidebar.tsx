'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart3, Bot, Warehouse, Package, ShoppingCart, Settings,
  PlusCircle, Users, LogOut, X, ChevronLeft, ChevronRight, Circle
} from 'lucide-react';

// Centralisation propre des couleurs réutilisables dans les styles dynamiques si nécessaire
const C = {
  sand: '#F9FBF8',
  border: 'rgba(6, 78, 59, 0.07)',
};

interface ProductorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductorSidebar({ isOpen, onClose }: ProductorSidebarProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? '';
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Optimisation : Mémoisation des liens pour éviter de recréer le tableau à chaque rendu
  const sidebarLinks = useMemo(() => [
    { name: 'Tableau de bord', href: '/dashboard', icon: BarChart3 },
    { name: 'Mes Agents IA', href: '/agents', icon: Bot },
    { name: 'Mon Stock', href: '/inventory', icon: Warehouse },
    { name: 'Catalogue', href: '/products', icon: Package },
    { name: 'Ventes', href: '/sales', icon: ShoppingCart },
    { name: 'Nouveau Produit', href: '/products/add', icon: PlusCircle },
    { name: 'Mes Clients', href: '/clients', icon: Users },
    { name: 'Paramètres', href: '/settings', icon: Settings },
  ], []);

  return (
    <>
      {/* Overlay mobile optimisé */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[rgba(6,78,59,0.08)] backdrop-blur-[4px] md:hidden transition-opacity duration-300"
        />
      )}

      {/* Barre latérale (Sidebar) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-500 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:h-screen
          ${isCollapsed ? 'w-24' : 'w-72'}
        `}
        style={{
          backgroundColor: C.sand,
          borderRight: `1px solid ${C.border}`,
        }}
      >
        {/* Bouton de bascule (Toggle) Desktop */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Agrandir la barre latérale" : "Réduire la barre latérale"}
          className="hidden md:flex absolute -right-3 top-10 w-6 h-6 bg-white items-center justify-center rounded-full text-slate-500 cursor-pointer z-50 shadow-[0_2px_8px_rgba(6,78,59,0.06)] hover:text-emerald-800 transition-colors"
          style={{ border: `1px solid ${C.border}` }}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Conteneur principal */}
        <div className={`flex flex-col h-full ${isCollapsed ? 'p-4' : 'p-6'}`}>
          
          {/* EN-TÊTE (Logo) */}
          <div className={`flex items-center mb-10 shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
            <Link href="/dashboard" onClick={onClose} className="no-underline">
              {isCollapsed ? (
                <span className="font-['Space_Grotesk'] text-2xl font-extrabold text-emerald-950">
                  F<span className="text-emerald-500">.</span>
                </span>
              ) : (
                <div>
                  <span className="font-['Space_Grotesk'] text-3xl font-extrabold text-emerald-950 tracking-tight block leading-none">
                    FrontAg<span className="text-emerald-500">.</span>
                  </span>
                  <span className="font-['Inter'] text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">
                    Espace Producteur
                  </span>
                </div>
              )}
            </Link>
            
            {/* Bouton fermer sur Mobile */}
            <button 
              onClick={onClose} 
              aria-label="Fermer le menu"
              className="md:hidden bg-transparent border-none cursor-pointer text-slate-500 p-1 hover:text-emerald-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* NAVIGATION (Contenu défilable si trop de liens) */}
          <nav className="flex-1 overflow-y-auto flex flex-col gap-1 pr-2 custom-scrollbar">
            {sidebarLinks.map((link) => {
              // Vérification stricte ou par préfixe pour le statut actif
              const isActive = currentPath === link.href || (link.href !== '/dashboard' && currentPath.startsWith(link.href));
              
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={onClose}
                  title={isCollapsed ? link.name : undefined}
                  className={`
                    flex items-center rounded-2xl no-underline transition-all duration-300 group
                    ${isCollapsed ? 'justify-center py-3.5' : 'justify-between py-3 px-4.5'}
                    ${isActive 
                      ? 'bg-white/72 border-[rgba(6,78,59,0.07)] shadow-[0_2px_12px_rgba(6,78,59,0.04)]' 
                      : 'bg-transparent border-transparent hover:bg-emerald-50/40'
                    }
                  `}
                  style={{ borderWidth: '1px' }}
                >
                  <div className={`flex items-center ${isCollapsed ? 'gap-0' : 'gap-3.5'}`}>
                    <link.icon 
                      size={isCollapsed ? 20 : 18} 
                      className={`transition-colors duration-200 ${isActive ? 'text-emerald-950' : 'text-slate-500 group-hover:text-emerald-700'}`} 
                    />
                    {!isCollapsed && (
                      <span className={`font-['Inter'] text-xs uppercase tracking-wider transition-colors duration-200 ${isActive ? 'font-bold text-emerald-950' : 'font-semibold text-slate-500 group-hover:text-emerald-900'}`}>
                        {link.name}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && isActive && (
                    <Circle size={6} className="fill-emerald-500 text-emerald-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* PIED DE PAGE / DÉCONNEXION */}
          <div className="pt-5 mt-auto" style={{ borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={() => { onClose(); logout(); }}
              title={isCollapsed ? 'Déconnexion' : undefined}
              className={`
                w-full flex items-center bg-red-600/5 text-red-600 rounded-2xl border-none cursor-pointer transition-colors duration-200 hover:bg-red-600/10 font-['Inter'] text-xs font-bold uppercase tracking-wider
                ${isCollapsed ? 'justify-center p-3.5' : 'justify-flex-start gap-3.5 py-3 px-4.5'}
              `}
            >
              <LogOut size={isCollapsed ? 18 : 16} />
              {!isCollapsed && <span>Déconnexion</span>}
            </button>
          </div>

        </div>
      </aside>
    </>
  );
}