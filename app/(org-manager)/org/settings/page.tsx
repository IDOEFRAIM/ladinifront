'use client';

import React, { useState, useEffect } from 'react';
import { getOrgSettings, updateOrgSettings } from '@/services/org-manager.service';
import { Building2, Save, Loader2 } from 'lucide-react';

const ORG_TYPES = [
  { value: 'GOVERNMENT_REGIONAL', label: 'Gouvernement Régional' },
  { value: 'COOPERATIVE', label: 'Coopérative' },
  { value: 'NGO', label: 'ONG' },
  { value: 'PRIVATE_TRADER', label: 'Commerçant Privé' },
  { value: 'RESELLER', label: 'Revendeur' },
] as const;

interface OrgData {
  id: string;
  name: string;
  type: string;
  taxId: string | null;
  description: string | null;
  createdAt: string;
}

export default function OrgSettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('COOPERATIVE');
  const [taxId, setTaxId] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const result = await getOrgSettings();
    if (result.success && result.data) {
      const data = result.data as OrgData;
      setOrg(data);
      setName(data.name);
      setType(data.type);
      setTaxId(data.taxId || '');
      setDescription(data.description || '');
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur de chargement' });
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await updateOrgSettings({ name, type, taxId: taxId || null, description: description || null });

    if (result.success) {
      setMessage({ type: 'success', text: 'Paramètres mis à jour avec succès.' });
      loadSettings();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur lors de la mise à jour.' });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 size={24} className="text-emerald-700" />
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            Paramètres de l&apos;organisation
          </h1>
        </div>
        <p className="text-sm text-stone-500">
          Modifiez les informations de votre organisation. Les changements seront enregistrés dans le journal d&apos;audit.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

        {/* Pending banner */}
        {org && (org as any).status === 'PENDING' && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium bg-yellow-50 text-yellow-800 border border-yellow-200">
            Cette organisation est en cours de validation par l'administration. Certaines actions peuvent être restreintes.
          </div>
        )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
              Nom de l&apos;organisation *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
              placeholder="Ex: Coopérative Agricole de Koudougou"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
              Type d&apos;entitée *
            </label>
            <select
              required
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            >
              {ORG_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Tax ID */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
              Numéro d&apos;identification fiscale (IFU)
            </label>
            <input
              type="text"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
              placeholder="Optionnel"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors resize-none"
              placeholder="Décrivez votre organisation…"
            />
          </div>
        </div>

        {/* Meta info */}
        {org && (
          <p className="text-xs text-stone-400">
            Créée le {new Date(org.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            &nbsp;· ID: {org.id}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-emerald-700 text-white py-3 px-6 rounded-full text-sm font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  );
}
