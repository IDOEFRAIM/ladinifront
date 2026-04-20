'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, History, Menu, X } from 'lucide-react';

const C = { forest: '#064E3B', emerald: '#10B981', sand: '#F9FBF8', border: 'rgba(6,78,59,0.07)', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

const NAV_ITEMS = [
  { href: '/agent/distributions', label: 'Nouvelle distribution', icon: Package },
  { href: '/agent/history', label: 'Historique', icon: History },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentPath = pathname ?? '';

  return (
    <div style={{ minHeight: '100vh', background: C.sand, fontFamily: F.body }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: C.forest, color: '#fff', padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: F.heading,
      }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>FrontAg · Agent</span>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}
          aria-label="Menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile nav */}
      {menuOpen && (
        <nav style={{
          background: '#fff', borderBottom: `1px solid ${C.border}`,
          padding: '8px 0',
        }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = currentPath === href || currentPath.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 20px', textDecoration: 'none',
                  color: active ? C.emerald : C.text,
                  fontWeight: active ? 600 : 400,
                  background: active ? 'rgba(16,185,129,0.06)' : 'transparent',
                }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Desktop nav */}
      <nav style={{
        display: 'none', background: '#fff', borderBottom: `1px solid ${C.border}`,
        padding: '0 20px',
      }}
        className="agent-desktop-nav"
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = currentPath === href || currentPath.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '12px 16px', textDecoration: 'none',
                  color: active ? C.emerald : C.text,
                  fontWeight: active ? 600 : 400,
                  borderBottom: active ? `2px solid ${C.emerald}` : '2px solid transparent',
                  fontSize: '0.9rem',
                }}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </main>

      <style>{`
        @media (min-width: 768px) {
          .agent-desktop-nav { display: block !important; }
        }
      `}</style>
    </div>
  );
}
