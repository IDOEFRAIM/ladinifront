"use client";

import React, { useState } from "react";

type Zone = { id: string; name: string };

export default function ZoneSelector({ zones, currentZoneId }: { zones: Zone[]; currentZoneId?: string | null }) {
  const [selected, setSelected] = useState<string | undefined>(currentZoneId || undefined);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (!selected) return setMessage('Veuillez choisir une zone');
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/zone', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId: selected }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Erreur');
      setMessage('Zone mise à jour');
    } catch (err: any) {
      setMessage(err?.message || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Zone active</label>
      <div className="flex gap-2 items-center">
        <select className="rounded border px-3 py-2" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">-- Choisir une zone --</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
        <button className="btn" onClick={save} disabled={loading}>
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
      {message && <div className="text-sm text-slate-600">{message}</div>}
    </div>
  );
}
