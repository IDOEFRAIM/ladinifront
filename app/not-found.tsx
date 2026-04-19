import Link from 'next/link';
import React from 'react';

export default function NotFound() {
  return (
    <div style={{ padding: 40, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Page introuvable</h1>
      <p style={{ color: '#334155', marginBottom: 16 }}>La page que vous recherchez n'existe pas ou a été déplacée.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/" style={{ background: '#0ea5e9', color: 'white', padding: '8px 12px', borderRadius: 6, textDecoration: 'none' }}>Accueil</Link>
        <Link href="/distributions" style={{ border: '1px solid #e6e6e6', padding: '8px 12px', borderRadius: 6, textDecoration: 'none' }}>Mes distributions</Link>
      </div>
      <p style={{ marginTop: 20, color: '#64748b' }}>Si vous pensez qu'il s'agit d'une erreur, contactez l'administrateur.</p>
    </div>
  );
}
