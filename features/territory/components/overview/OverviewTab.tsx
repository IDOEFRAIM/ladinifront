'use client';

import { useMemo } from 'react';
import { ChevronRight, Zap, TrendingUp } from 'lucide-react';
import { C, F } from '@/features/territory/components/overview/territories.tokens';
import { TerritoryStatsData } from '@/features/territory/components/overview/territories.types';
import { GlassCard } from '@/features/territory/components/overview/TerritoryGlassCard';

export interface OverviewTabProps {
  stats: TerritoryStatsData;
  onNavigateToLocation: (id: string) => void;
}

export function OverviewTab({ stats, onNavigateToLocation }: OverviewTabProps) {
  const topLocations = useMemo(() => [...stats.locationStats].sort((a, b) => (b.gmv ?? b.orders) - (a.gmv ?? a.orders)).slice(0, 5), [stats]);
  const sleepingLocations = useMemo(() => stats.locationStats.filter(z => (z.orders || 0) === 0), [stats]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <GlassCard style={{ padding: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.forest, fontFamily: F.heading, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} color={C.emerald} /> Top 5 Zones Performantes
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topLocations.map((z, i) => (
            <div key={z.locationId} onClick={() => onNavigateToLocation(z.locationId)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 16, background: 'rgba(6,78,59,0.03)', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,78,59,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(6,78,59,0.03)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: 10, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{i + 1}</span>
                <span style={{ fontWeight: 700, color: C.forest, fontFamily: F.heading }}>{z.locationName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{z.orders} cmd</span>
                <span style={{ fontSize: 12, color: C.muted }}>{z.producers} prod.</span>
                <ChevronRight size={16} color={C.muted} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {sleepingLocations.length > 0 && (
        <GlassCard style={{ padding: 28, borderLeft: `4px solid ${C.amber}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.amber, fontFamily: F.heading, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} /> Zones Dormantes ({sleepingLocations.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sleepingLocations.map(z => (
              <span key={z.locationId} onClick={() => onNavigateToLocation(z.locationId)}
                style={{ padding: '6px 16px', borderRadius: 100, background: 'rgba(217,119,6,0.08)', color: C.amber, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {z.locationName}
              </span>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
