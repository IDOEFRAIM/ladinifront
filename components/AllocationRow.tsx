"use client";
import React, { useState } from 'react';

export default function AllocationRow({ allocation }: { allocation: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [seedType, setSeedType] = useState(allocation.seedType || '');
  const [totalQuantity, setTotalQuantity] = useState<number | ''>(allocation.totalQuantity ?? '');
  const [unit, setUnit] = useState(allocation.unit ?? 'KG');
  const [zoneId, setZoneId] = useState(allocation.zoneId ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function doDelete() {
    if (!confirm('Supprimer cette allocation ?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/org/allocations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: allocation.id }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        location.reload();
      } else {
        setMsg(String(j?.error || 'Failed'));
      }
    } catch (e: any) {
      setMsg(String(e?.message || 'Error'));
    } finally {
      setBusy(false);
    }
  }

  async function doSave() {
    setBusy(true);
    setMsg(null);
    try {
      const body: any = { id: allocation.id };
      if (seedType !== allocation.seedType) body.seedType = seedType;
      if (totalQuantity !== allocation.totalQuantity) body.totalQuantity = Number(totalQuantity);
      if (unit !== allocation.unit) body.unit = unit;
      if (zoneId !== allocation.zoneId) body.zoneId = zoneId || null;

      const res = await fetch('/api/org/allocations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        location.reload();
      } else {
        setMsg(String(j?.error || 'Failed'));
      }
    } catch (e: any) {
      setMsg(String(e?.message || 'Error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: 12 }}>
        {isEditing ? <input value={seedType} onChange={(e) => setSeedType(e.target.value)} /> : allocation.seedType}
      </td>
      <td style={{ padding: 12 }}>
        {isEditing ? <input type="number" value={totalQuantity as any} onChange={e => setTotalQuantity(e.target.value === '' ? '' : Number(e.target.value))} /> : allocation.totalQuantity}
      </td>
      <td style={{ padding: 12 }}>{allocation.remainingQuantity}</td>
      <td style={{ padding: 12 }}>{isEditing ? <input value={zoneId ?? ''} onChange={e => setZoneId(e.target.value)} /> : allocation.zoneId ?? '—'}</td>
      <td style={{ padding: 12 }}>{allocation.createdAt}</td>
      <td style={{ padding: 12 }}>
        {isEditing ? (
          <>
            <button disabled={busy} onClick={doSave} style={{ marginRight: 8 }}>Save</button>
            <button disabled={busy} onClick={() => setIsEditing(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => setIsEditing(true)} style={{ marginRight: 8 }}>Edit</button>
            <button disabled={busy} onClick={doDelete} style={{ color: 'crimson' }}>Delete</button>
          </>
        )}
        {msg && <div style={{ color: 'var(--muted)', marginTop: 6 }}>{msg}</div>}
      </td>
    </tr>
  );
}
