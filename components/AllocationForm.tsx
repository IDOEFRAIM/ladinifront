"use client";
import { useState, useEffect } from 'react';

export default function AllocationForm() {
  const [seedType, setSeedType] = useState('');
  const [totalQuantity, setTotalQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('KG');
  const [zoneId, setZoneId] = useState('');
  const [zones, setZones] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/zones');
        const j = await res.json();
        const list = Array.isArray(j) ? j : (j?.data || []);
        setZones(list);
        if (list.length && !zoneId) setZoneId(list[0].id);
      } catch (e) {
        console.debug('Failed to load zones', e);
      }
    })();
  }, []);

  async function handleSubmit(e: any) {
    e.preventDefault();
    setMessage(null);
    if (isSubmitting) return;
    if (!seedType || !totalQuantity) return setMessage('Please fill required fields');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/org/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedType, totalQuantity: Number(totalQuantity), unit, zoneId }),
      });
      const j = await res.json();
      const createdId = j?.allocation?.id;
      if (res.ok && createdId) {
        setMessage('Allocation created');
        setSeedType(''); setTotalQuantity('');
      } else {
        setMessage(String(j?.error || 'Failed'));
      }
    } catch (e: any) {
      setMessage(String(e?.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, background: 'white', padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
      <h3 style={{ marginTop: 0 }}>Create Allocation</h3>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 700 }}>Seed type</label>
          <input value={seedType} onChange={e => setSeedType(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 700 }}>Quantity</label>
          <input type="number" value={totalQuantity as any} onChange={e => setTotalQuantity(e.target.value === '' ? '' : Number(e.target.value))} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 700 }}>Unit</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}>
            <option>KG</option>
            <option>G</option>
            <option>PACK</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 700 }}>Zone</label>
          <select value={zoneId} onChange={e => setZoneId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}>
            <option value="">-- all zones --</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name || z.id}</option>)}
          </select>
        </div>

        <div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
          <button type="submit" disabled={isSubmitting} style={{ background: isSubmitting ? 'var(--muted)' : 'var(--foreground)', color: 'white', padding: '10px 14px', borderRadius: 8, border: 'none' }}>
            {isSubmitting ? 'Creating…' : 'Create allocation'}
          </button>
          {message && <span style={{ marginLeft: 12, color: 'var(--muted)' }}>{message}</span>}
        </div>
      </form>
    </div>
  );
}
