"use client";
import React from 'react';
import Link from 'next/link';

type Props = { error: Error; reset: () => void };

export default function GlobalError({ error, reset }: Props) {
  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Une erreur est survenue</h1>
      <p style={{ color: '#475569' }}>Nous avons rencontré un problème. Vous pouvez réessayer ou retourner à l'accueil.</p>

      <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
        <button onClick={() => reset()} style={{ background: '#10b981', color: 'white', padding: '8px 12px', borderRadius: 6, border: 'none' }}>Réessayer</button>
        <Link href="/" style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e6e6e6', textDecoration: 'none' }}>Accueil</Link>
      </div>

      <div style={{ marginTop: 20, background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
        <strong style={{ display: 'block', marginBottom: 6 }}>Détails (debug):</strong>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#0f172a' }}>{String(error?.message ?? error)}</pre>
      </div>
    </div>
  );
}
