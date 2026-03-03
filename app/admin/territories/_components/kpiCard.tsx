const C = { forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

export default function KpiCard({ icon, label, value, color, trend }: { icon: React.ReactNode; label: string; value: string | number; color: string; trend?: number }) {
  const colorMap: Record<string, { bg: string; fg: string }> = {
    blue: { bg: 'rgba(59,130,246,0.08)', fg: '#3B82F6' },
    green: { bg: 'rgba(16,185,129,0.08)', fg: C.emerald },
    amber: { bg: 'rgba(217,119,6,0.08)', fg: C.amber },
    indigo: { bg: 'rgba(99,102,241,0.08)', fg: '#6366F1' },
    emerald: { bg: 'rgba(16,185,129,0.08)', fg: C.emerald },
  };
  const cm = colorMap[color] || colorMap.green;
  const trendColor = trend && trend > 0 ? C.emerald : trend && trend < 0 ? '#EF4444' : C.muted;
  return (
    <div style={{ background: C.glass, backdropFilter: 'blur(16px)', borderRadius: 24, border: `1px solid ${C.border}`, padding: 20, display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.3s', cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(6,78,59,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: cm.bg, color: cm.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 28, fontWeight: 800, color: C.forest, fontFamily: F.heading, letterSpacing: '-0.02em' }}>{value}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <p style={{ fontSize: 12, color: C.muted, fontWeight: 500, fontFamily: F.body }}>{label}</p>
        <span style={{ fontSize: 12, fontWeight: 700, color: trendColor }}>
          {trend === undefined ? '' : (trend > 0 ? `+${trend}%` : `${trend}%`)}
        </span>
      </div>
    </div>
  );
}
