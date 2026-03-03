import React from 'react';
import Link from 'next/link';
import { getOrganizationDetails } from '@/services/org-manager.service';

export default async function OrgDashboardPage() {
  const res = await getOrganizationDetails();
  if (!res.success) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-2xl font-bold">Tableau de bord organisation</h1>
        <p className="mt-4 text-sm text-red-600">{res.error || 'Impossible de charger les informations.'}</p>
      </div>
    );
  }

  const d = res.data as any;

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">{d.name}</h1>
          {d.description && <p className="text-sm text-stone-500 mt-1">{d.description}</p>}
          <p className="text-xs text-stone-400 mt-2">Créée le {new Date(d.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/org/members" className="px-4 py-2 rounded-full bg-emerald-700 text-white font-bold">Membres</Link>
          <Link href="/org/settings" className="px-4 py-2 rounded-full border">Paramètres</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-sm text-stone-500">Membres</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">{d.membersCount}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-sm text-stone-500">Zones de travail</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">{d.zonesCount}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-sm text-stone-500">Rôles personnalisés</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">{d.roleDefsCount}</div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl p-4 border">
        <h2 className="text-lg font-bold mb-2">Aperçu</h2>
        <p className="text-sm text-stone-600">Liens rapides : gestion des membres, zones et paramètres.</p>
      </div>
    </div>
  );
}
