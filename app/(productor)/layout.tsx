'use client';

import React, { useState, useEffect } from 'react';
import ProductorSidebar from '@/components/utils/productorSidebar';
import { Menu, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
};

function useProductorAccessControl(userRole: string | undefined, activeOrg: { id: string; name: string; role: string } | null, isAuthenticated: boolean, isLoading: boolean, router: any) {
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    const role = userRole?.toUpperCase();
    // SUPERADMIN and ADMIN bypass org check
    if (role === 'SUPERADMIN' || role === 'ADMIN') return;
    // Org members can access producer pages
    //if (!activeOrg) {
      //router.replace('/market');
    //}
  }, [isLoading, isAuthenticated, userRole, activeOrg, router]);
}

function LoadingScreen({ showContinueBtn, onContinue }: { showContinueBtn: boolean; onContinue: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: C.sand,
    }}>
      <Loader2 size={36} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 500, color: C.muted, marginTop: 16 }}>
        Verification de vos acces producteur...
      </p>
      {showContinueBtn && (
        <button onClick={onContinue} style={{
          marginTop: 18, padding: '10px 20px', background: C.amber, color: '#fff',
          borderRadius: 100, border: 'none', cursor: 'pointer',
          fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13,
        }}>
          Probleme ? Continuer vers la connexion
        </button>
      )}
    </div>
  );
}

export default function ProductorLayout({ children }: { children: React.ReactNode }) {
  const { userRole, isAuthenticated, isLoading, activeOrg } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showContinueBtn, setShowContinueBtn] = useState(false);

  useProductorAccessControl(userRole, activeOrg, isAuthenticated, isLoading, router);

  useEffect(() => {
    if (!isLoading) { setShowContinueBtn(false); return; }
    const t = setTimeout(() => setShowContinueBtn(true), 3500);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading) {
    return <LoadingScreen showContinueBtn={showContinueBtn} onContinue={() => router.replace('/login')} />;
  }

  const role = userRole?.toUpperCase();
  if (!isAuthenticated) {
    return <p>not Authenticated</p>;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.sand, overflow: 'hidden' }}>
      <ProductorSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', overflow: 'hidden' }}>
        {/* MOBILE HEADER */}
        <header className="md:hidden" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 64, position: 'sticky', top: 0, zIndex: 30,
          background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <button onClick={() => setIsSidebarOpen(true)} style={{
            padding: 8, marginLeft: -8, background: 'transparent', border: 'none',
            cursor: 'pointer', color: C.forest, display: 'flex', alignItems: 'center',
          }}>
            <Menu size={22} />
          </button>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: C.forest, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
            Espace Producteur
          </span>
          <div style={{ width: 32 }} />
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: 16 }} className="md:p-8">
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
