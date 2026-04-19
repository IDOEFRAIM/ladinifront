import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#F9FBF8', fontFamily: "'Space Grotesk', sans-serif" }}>
      <h1 style={{ fontSize: '4rem', color: '#064E3B', margin: 0 }}>403</h1>
      <p style={{ fontSize: '1.25rem', color: '#374151', marginTop: 8 }}>
        Accès refusé — vous n&apos;avez pas les permissions nécessaires.
      </p>
      <Link
        href="/"
        style={{ marginTop: 24, padding: '10px 24px', background: '#10B981', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
