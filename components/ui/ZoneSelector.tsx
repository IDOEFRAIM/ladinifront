"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useZone } from '@/context/ZoneContext';

// Searchable dropdown that shows a scrollable list of all zones and allows typing to filter.
export default function ZoneSelector() {
  const { zoneId, setZoneId } = useZone();
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/zones');
        const j = await res.json();
        if (Array.isArray(j)) setZones(j);
        else if (j && Array.isArray((j as any).data)) setZones((j as any).data);
        else setZones([]);
      } catch (e) {
        console.error(e);
        setZones([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const filtered = zones.filter(z => {
    if (!query) return true;
    const q = query.toLowerCase();
    return String(z.name || z.id || '').toLowerCase().includes(q) || String(z.region || '').toLowerCase().includes(q);
  });

  const selectZone = (id: string | null) => {
    setZoneId(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: 12 }}>
      <label style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>Zone :</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 320 }}>
          <input
            aria-label="Rechercher une zone"
            placeholder="Rechercher une zone..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <div style={{ position: 'absolute', right: 8, top: 8 }}>
            <button onClick={() => selectZone(null)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>Toutes</button>
          </div>
          {open && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, maxHeight: 240, overflowY: 'auto', zIndex: 40 }}>
              {loading ? (
                <div style={{ padding: 12, color: '#6b7280' }}>Chargement...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 12, color: '#6b7280' }}>Aucune zone trouvée</div>
              ) : (
                filtered.map((z: any) => (
                  <div key={z.id} onClick={() => selectZone(z.id)} style={{ padding: 10, borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700 }}>{z.name || z.id}</div>
                    {z.region && <div style={{ fontSize: 12, color: '#6b7280' }}>{z.region}</div>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div style={{ minWidth: 140 }}>
          <div style={{ fontSize: 12, color: '#374151' }}>Sélection actuelle:</div>
          <div style={{ fontWeight: 800 }}>{(zones.find(z => z.id === zoneId)?.name) || 'Toutes'}</div>
        </div>
      </div>
    </div>
  );
}
