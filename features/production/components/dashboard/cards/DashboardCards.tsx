'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { THEME_COLORS as C, THEME_FONTS as F } from '@/lib/theme';

export function KpiCard({
  icon: Icon,
  accent,
  accentBg,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  accent: string;
  accentBg: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 24,
        border: `1px solid ${C.border}`,
        boxShadow: '0 10px 30px rgba(6,78,59,0.03)',
        padding: '20px 22px',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        <Icon size={18} color={accent} />
      </div>
      <p style={{ fontFamily: F.body, fontSize: '0.72rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </p>
      {/* Un nombre ne se fragmente jamais : nowrap + ellipsis en dernier recours plutôt
          qu'un break-word qui le couperait au milieu (le séparateur de milliers fr-FR
          est une espace insécable — voir StockValueCard pour le même principe). */}
      <p
        style={{
          fontFamily: F.heading,
          fontSize: '1.5rem',
          fontWeight: 800,
          color: C.forest,
          marginTop: 4,
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </p>
      <p style={{ fontFamily: F.body, fontSize: '0.72rem', color: C.muted, marginTop: 2, overflowWrap: 'break-word', lineHeight: 1.3 }}>
        {hint}
      </p>
    </div>
  );
}

// Notation compacte (ex: 240,6 Md au lieu de 240 570 000 000) — évite qu'une
// grosse valeur de stock ne déborde de sa carte à largeur fixe. La valeur
// exacte reste disponible via l'attribut `title` (survol) sur l'élément appelant.
export function formatCompactFCFA(value: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function StockValueCard({ totalValue }: { totalValue: number }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.forest} 0%, ${C.emerald} 100%)`,
        borderRadius: 28,
        padding: 28,
        color: C.white,
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <p style={{ fontFamily: F.body, fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
        Valeur estimée du stock
      </p>
      <h3
        title={`${totalValue.toLocaleString('fr-FR')} FCFA`}
        style={{ fontFamily: F.heading, fontSize: '2.1rem', fontWeight: 800, marginBottom: 10, lineHeight: 1.15, letterSpacing: '-0.02em' }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>{formatCompactFCFA(totalValue)}</span>{' '}
        <span style={{ fontFamily: F.body, fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>FCFA</span>
      </h3>
      <span style={{ fontFamily: F.body, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(255,255,255,0.16)', padding: '5px 12px', borderRadius: 100 }}>
        Prix du marché en direct
      </span>
    </div>
  );
}

export function OrganizationCard({ organization, perishableCount }: { organization: any; perishableCount: number }) {
  if (!organization) {
    return (
      <div style={{ borderRadius: 24, border: `1px dashed ${C.border}`, background: C.white, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Building2 size={16} color={C.muted} />
          <p style={{ fontFamily: F.heading, fontSize: '0.85rem', fontWeight: 700, color: C.text }}>Aucune organisation active</p>
        </div>
        <p style={{ fontFamily: F.body, fontSize: '0.78rem', color: C.muted, lineHeight: 1.5 }}>
          Associez-vous à une coopérative pour débloquer le suivi collectif.
        </p>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 24, border: `1px solid ${C.border}`, padding: 22, background: C.white }}>
      <p style={{ fontFamily: F.body, fontSize: '0.7rem', color: C.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
        Organisation active
      </p>
      <h3 style={{ fontFamily: F.heading, fontSize: '1.15rem', fontWeight: 800, color: C.forest, marginTop: 6, overflowWrap: 'break-word' }}>
        {organization.name || organization.organizationId || 'Organisation'}
      </h3>
      <p style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.text, marginTop: 4 }}>
        {organization.role ? `Rôle : ${organization.role}` : 'Producteur membre'}
      </p>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: C.muted, fontFamily: F.body }}>
        <span>{filteredLabel(perishableCount)} périssables</span>
        <span>{new Date().toLocaleDateString('fr-FR')}</span>
      </div>
    </div>
  );
}

export function filteredLabel(count: number) {
  if (count === 0) return '0 lot urgent';
  if (count === 1) return '1 lot urgent';
  return `${count} lots urgents`;
}
