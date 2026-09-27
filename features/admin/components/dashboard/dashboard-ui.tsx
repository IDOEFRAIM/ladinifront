/* Les métriques viennent de /api/admin/metrics (JSON non typé côté client). */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';

export const C = {
  forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706',
  sand: '#F9FBF8', glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)',
  muted: '#64748B', text: '#1F2937',
};
export const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" };

export function GlassCard({ children, style = {}, ...rest }: any) {
  return (
    <div style={{
      background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 32, border: `1px solid ${C.border}`, padding: 28,
      transition: 'box-shadow 0.3s', ...style,
    }} {...rest}>{children}</div>
  );
}

export const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0);

export const KpiCard = ({ label, value, sub, accent, icon, isAlert = false }: any) => (
  <div style={{ background: 'white', borderRadius: 16, padding: 18, border: '1px solid rgba(6,78,59,0.04)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>{label}</p>
        <h3 style={{ fontFamily: F.heading, fontWeight: 900, marginTop: 8 }}>{value}</h3>
        <p style={{ fontSize: 12, color: '#6B7280' }}>{sub}</p>
      </div>
      <div style={{ width: 56, height: 56, borderRadius: 12, background: accent || '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon || null}
      </div>
    </div>
  </div>
);

export const FeedItem = ({ type, title, desc, time, amount, zone }: any) => (
  <div style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid rgba(6,78,59,0.03)' }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(6,78,59,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontWeight: 800 }}>{title}</p>
          <p style={{ fontSize: 12, color: '#6B7280' }}>{desc}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 800 }}>{amount} FCFA</p>
          <p style={{ fontSize: 11, color: '#6B7280' }}>{time.toLocaleString()}</p>
        </div>
      </div>
    </div>
  </div>
);

export const AdminActionLink = ({ href, icon, label, count, highlight }: any) => (
  <Link href={href} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: '#111' }}>
    <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.03)' }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 12, fontWeight: 800 }}>{label}</p>
      <p style={{ fontSize: 12, color: '#6B7280' }}>{count}</p>
    </div>
    {highlight && <div style={{ background: '#DC2626', color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800 }}>!</div>}
  </Link>
);
