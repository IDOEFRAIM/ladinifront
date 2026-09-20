import type React from 'react';

export default function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(6,78,59,0.07)', borderRadius: 14, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14, minWidth: 160,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}
