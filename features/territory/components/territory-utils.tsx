//  Small UI helpers 
const C = { forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };

export function SmallProgress({ label, percent }: { label: string; percent: number }) {
  return (
    <div style={{ width: 160 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>
        <span>{label}</span><span>{Math.round(percent)}%</span>
      </div>
      <div style={{ width: '100%', background: C.border, height: 6, borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ background: `linear-gradient(90deg, ${C.forest}, ${C.emerald})`, height: '100%', borderRadius: 100, width: `${Math.min(Math.max(percent, 0), 100)}%`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export function MiniSparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
      {values.map((v, i) => (
        <div key={i} style={{ height: `${(v / max) * 100}%`, width: 6, background: `linear-gradient(to top, ${C.forest}, ${C.emerald})`, borderRadius: 3 }} />
      ))}
    </div>
  );
}
