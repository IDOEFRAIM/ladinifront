"use client";
import React, { useState } from 'react';

export default function CreateOrganizationClient({ serverCreateOrganization }: { serverCreateOrganization?: (data: any) => Promise<any> }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('COOPERATIVE');
  const [taxId, setTaxId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (typeof serverCreateOrganization === 'function') {
        const res = await serverCreateOrganization({ name, type, taxId: taxId || null, description: description || null });
        if (res && res.success) {
          window.location.href = '/admin/organizations';
          return;
        }
        setMessage(res?.error || 'Erreur');
      } else {
        const res = await fetch('/api/admin/create-organization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, type, taxId: taxId || null, description: description || null }),
        });
        const json = await res.json();
        if (!json.success) {
          setMessage(json.error || 'Erreur');
        } else {
          window.location.href = '/admin/organizations';
          return;
        }
      }
    } catch (err) {
      setMessage('Erreur réseau');
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Créer une organisation</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Nom</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full rounded border px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2">
            <option value="GOVERNMENT_REGIONAL">Gouvernement régional</option>
            <option value="COOPERATIVE">Coopérative</option>
            <option value="NGO">ONG</option>
            <option value="PRIVATE_TRADER">Négociant privé</option>
            <option value="RESELLER">Revendeur</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Identifiant fiscal (optionnel)</label>
          <input value={taxId} onChange={e => setTaxId(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Description (optionnelle)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" rows={4} />
        </div>

        <div>
          <button disabled={loading} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'Création...' : 'Créer l\'organisation'}
          </button>
        </div>
        {message && <p className="mt-2 text-sm">{message}</p>}
      </form>
    </div>
  );
}
