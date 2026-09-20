'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { C, F } from '@/features/admin/components/dashboard/dashboard-ui';

import type { AdminTopZone } from '@/features/admin/types/admin-dashboard.types';

interface Props {
  topZones: AdminTopZone[];
}

export default function TopZonesPanel({ topZones }: Props) {
  return (
  <div style={{
    background: C.forest, borderRadius: 32, padding: 40, color: '#fff',
    position: 'relative', overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(6,78,59,0.15)',
  }}>
    <div style={{ position: 'relative', zIndex: 10 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 28 }}>Analyse Geographique - Burkina</p>
      <div style={{ display: 'grid', gap: 16 }} className="grid-cols-1 md:grid-cols-3">
        {topZones.length ? topZones.map((zone) => (
          <div key={zone.id} style={{
            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
            padding: 24, borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)',
            transition: 'background 0.2s',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.emerald, textTransform: 'uppercase', marginBottom: 4 }}>{zone.region}</p>
            <h5 style={{ fontFamily: F.heading, fontSize: 17, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em' }}>{zone.name}</h5>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
              <div>
                <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>{zone.producers}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>Prod.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '1.15rem', fontWeight: 800, color: C.amber }}>{zone.orders}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>Cmds.</p>
              </div>
            </div>
          </div>
        )) : (
          <div>
            Pas encore de zone,vous pouvez en ajouter 
            <Link href="/admin/territories" className="text-sm text-white mx-2 hover:underline">ici</Link>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
