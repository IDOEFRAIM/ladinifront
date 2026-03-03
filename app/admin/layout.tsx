'use client';

import React, { useEffect } from 'react';
import AdminNavbar from '@/components/utils/adminNavbar';
import Link from 'next/link';
import { Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userRole, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const role = userRole?.toUpperCase();
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (!['ADMIN', 'SUPERADMIN'].includes(role as string)) {
      router.replace('/market');
    }
  }, [isLoading, isAuthenticated, userRole, router]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: C.sand,
      }}>
        <Loader2 size={36} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 500, color: C.muted, marginTop: 16 }}>
          Verification des privileges admin...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !['ADMIN', 'SUPERADMIN'].includes(userRole?.toUpperCase() as string)) {
    return <p>not authenticated</p>;
  }

  return (
    <div style={{ minHeight: '100vh', background: C.sand, display: 'flex', flexDirection: 'column' }}>

      {/* TOP HEADER */}
      <header style={{
        background: C.forest, color: '#fff', padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 30,
        boxShadow: '0 4px 24px rgba(6,78,59,0.12)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/admin" style={{
            display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1.15rem', color: '#fff',
            letterSpacing: '-0.02em',
          }}>
            <Shield size={20} style={{ color: C.emerald }} />
            <span>Admin<span style={{ color: C.emerald }}>.</span>Console</span>
          </Link>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700,
            background: 'rgba(16,185,129,0.15)', color: C.emerald,
            padding: '6px 14px', borderRadius: 100, textTransform: 'uppercase',
            letterSpacing: '0.1em', border: '1px solid rgba(16,185,129,0.2)',
          }} className="hidden sm:block">
            Mode Superviseur
          </span>
        </div>
      </header>

      {/* DESKTOP NAV */}
      <div className="hidden md:block" style={{
        background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.border}`,
        position: 'sticky', top: 64, zIndex: 20,
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
          <AdminNavbar />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main style={{
        maxWidth: 1280, margin: '10px auto', width: '100%',
        padding: 16, flex: 1, marginBottom: 80,
      }} className="md:p-8 mt-8 md:mb-0!">
        {children}
      </main>

      {/* MOBILE NAV */}
      <nav className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        boxShadow: '0 -4px 24px rgba(6,78,59,0.06)',
      }}>
        <AdminNavbar />
      </nav>
    </div>
  );
}
