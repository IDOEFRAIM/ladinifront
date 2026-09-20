"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function OrgListClient({ initialOrgs, serverApproveOrg, serverSelectOrg }: { initialOrgs: any[]; serverApproveOrg?: (orgId: string) => Promise<any>; serverSelectOrg?: (orgId: string) => Promise<any> }) {
  const [orgs, setOrgs] = useState<any[]>(initialOrgs || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userRole, isLoading: authLoading } = useAuth();
  const isAdmin = (userRole || '').toString().toUpperCase() === 'ADMIN' || (userRole || '').toString().toUpperCase() === 'SUPERADMIN';

  useEffect(() => {
    // initialOrgs already provided from server; keep as-is
  }, []);

  async function handleManage(orgId: string) {
    try {
      if (typeof serverSelectOrg === 'function') {
        const r = await serverSelectOrg(orgId).catch((e) => ({ success: false, error: String(e) }));
        if (r && r.success) {
          window.location.href = '/org/settings';
          return;
        }
        alert('Impossible de sélectionner organisation: ' + (r?.error || 'Erreur'));
      } else {
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
      }
    } catch (e) { alert('Erreur réseau'); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Organisations</h1>
        {!authLoading && isAdmin && (
          <Link href="/admin/organizations/create" className="px-3 py-2 bg-blue-600 text-white rounded">Créer</Link>
        )}
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
                {o.status === 'PENDING' && (
                  <button onClick={async () => {
                    if (!confirm('Approuver cette organisation ?')) return;
                    try {
                      if (typeof serverApproveOrg === 'function') {
                        const r = await serverApproveOrg(o.id).catch(e => ({ success: false, error: String(e) }));
                        if (r && r.success) {
                          window.location.reload();
                          return;
                        }
                        alert(r?.error || 'Erreur');
                      } else {
                        const res = await fetch('/api/admin/organizations/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId: o.id }) });
                        const j = await res.json();
                        if (j.success) window.location.reload(); else alert(j.error || 'Erreur');
                      }
                    } catch (e) { console.error(e); alert('Erreur'); }
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
