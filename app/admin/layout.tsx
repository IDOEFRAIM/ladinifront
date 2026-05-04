'use client';

import React, { useEffect } from 'react';
import AdminNavbar from '@/components/utils/adminNavbar';
import Link from 'next/link';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.85)',
  border: 'rgba(6, 78, 59, 0.1)',
  muted: '#64748B',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userRole, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const role = userRole?.toUpperCase();
    
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    
    if (!['ADMIN', 'SUPERADMIN'].includes(role as string)) {
      router.replace('/market');
    }
  }, [isLoading, isAuthenticated, userRole, router]);

  // Écran de chargement amélioré
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: C.sand,
      }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin" style={{ color: C.emerald }} />
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: C.forest, opacity: 0.8 }}>
            Vérification des accès...
          </p>
        </div>
      </div>
    );
  }

  // Sécurité renforcée pendant la redirection
  const roleUpper = userRole?.toUpperCase() || '';
  if (!isAuthenticated || !['ADMIN', 'SUPERADMIN'].includes(roleUpper)) {
    return null; // Évite le flash de contenu avant redirection
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: C.sand, 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative' 
    }}>

      {/* HEADER FIXE */}
      <header style={{
        background: C.forest, 
        color: '#fff', 
        padding: '0 20px', 
        height: 60,
        display: 'flex', 
        alignItems: 'center', 
        position: 'fixed', 
        top: 0, 
        left: 0,
        right: 0,
        zIndex: 100, // Doit être au-dessus de tout
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/admin" style={{
            display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#fff',
            letterSpacing: '-0.02em',
          }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: 6, borderRadius: 8 }}>
              <Shield size={18} style={{ color: C.emerald }} />
            </div>
            <span>Admin<span className="text-emerald-400">Console</span></span>
          </Link>

          <div style={{ 
            fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 800,
            background: 'rgba(16,185,129,0.1)', color: C.emerald,
            padding: '4px 12px', borderRadius: 6, textTransform: 'uppercase',
            border: '1px solid rgba(16,185,129,0.2)',
          }} className="hidden sm:block">
            {roleUpper === 'SUPERADMIN' ? 'Accès Racine' : 'Superviseur'}
          </div>
        </div>
      </header>

      {/* NAVIGATION SECONDAIRE (Desktop uniquement) */}
      <div className="hidden md:block" style={{
        marginTop: 60, // Hauteur du header
        background: C.glass, 
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.border}`,
        position: 'sticky',
        top: 60,
        zIndex: 90,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <AdminNavbar />
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <main style={{
        maxWidth: 1400, 
        margin: '0 auto', 
        width: '100%',
        padding: '24px 16px', 
        flex: 1,
        // On compense le header sur mobile et le header+nav sur desktop
        marginTop: 60, 
      }} className="md:mt-4 pb-24 md:pb-8">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* NAVIGATION MOBILE (Bouton flottant géré par ton AdminNavbar) */}
      <div className="md:hidden">
        <AdminNavbar />
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}