"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminOrganizationsList() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/organizations');
        const json = await res.json();
        if (!json.success) { setError(json.error || 'Erreur'); }
        else setOrgs(json.data || []);
      } catch (e) { setError('Erreur réseau'); }
      finally { setLoading(false); }
    })();
  }, []);

  async function handleManage(orgId: string) {
    try {
      const res = await fetch('/api/select-org', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId })
      });
      if (res.ok) {
        window.location.href = '/org/settings';
      } else {
        const j = await res.text();
        alert('Impossible de sélectionner organisation: ' + j);
      }
    } catch (e) { alert('Erreur réseau'); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Organisations</h1>
        <Link href="/admin/organizations/create" className="px-3 py-2 bg-blue-600 text-white rounded">Créer</Link>
      </div>
      {loading && <p>Chargement...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="grid gap-3">
          {orgs.map(o => (
            <div key={o.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-sm text-gray-600">{o.type} • {new Date(o.createdAt).toLocaleDateString()} {o.status === 'PENDING' && <span className="ml-2 text-yellow-600 font-semibold">(En attente)</span>}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleManage(o.id)} className="px-3 py-1 bg-green-600 text-white rounded">Gérer</button>
                <button onClick={() => handleManage(o.id)} className="px-3 py-1 bg-gray-100 rounded">Modifier</button>
                {o.status === 'PENDING' && (
                  <button onClick={async () => {
                    if (!confirm('Approuver cette organisation ?')) return;
                    const res = await fetch('/api/admin/organizations/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId: o.id }) });
                    const j = await res.json();
                    if (j.success) window.location.reload(); else alert(j.error || 'Erreur');
                  }} className="px-3 py-1 bg-amber-500 text-white rounded">Approuver</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
