"use client";
import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Upload, KeyRound } from 'lucide-react';

export default function DistributionReceiptForm({ distributionId }: { distributionId: string }) {
  const [code, setCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      if (file) {
        const fd = new FormData();
        fd.append('distributionId', distributionId);
        fd.append('file', file);
        const res = await fetch('/api/uploads/cnib', { method: 'POST', body: fd });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || 'Echec de l\'upload CNIB');
        }
      }

      const verifyRes = await fetch('/api/inventory/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionId, code }),
      });
      const j = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok || !j.ok) {
        const errorMsg = j.error === 'invalid_code' ? 'Code invalide. Verifiez et reessayez.'
          : j.error === 'expired' ? 'Code expire. Demandez un nouveau code a votre agent.'
          : j.error === 'insufficient_stock' ? 'Stock insuffisant pour finaliser cette distribution.'
          : j.error === 'not_found' ? 'Distribution introuvable.'
          : 'Echec de la verification du code.';
        setResult({ type: 'error', text: errorMsg });
      } else {
        setResult({ type: 'success', text: 'Distribution confirmee avec succes ! Les semences ont ete enregistrees.' });
        setCode('');
        setFile(null);
      }
    } catch (err: any) {
      setResult({ type: 'error', text: String(err?.message || 'Erreur inattendue.') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {/* Code input */}
        <div className="p-5 border-b border-stone-100">
          <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
            <KeyRound size={14} /> Code de verification *
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 border border-stone-300 rounded-xl bg-white text-stone-900 text-center font-mono text-2xl tracking-widest placeholder:text-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            required
          />
        </div>

        {/* CNIB upload */}
        <div className="p-5 border-b border-stone-100">
          <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
            <Upload size={14} /> Justificatif CNIB (optionnel)
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
          />
        </div>

        {/* Result */}
        {result && (
          <div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2 ${result.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {result.type === 'success' ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
            {result.text}
          </div>
        )}

        {/* Submit */}
        <div className="p-5">
          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {loading ? 'Verification en cours...' : 'Confirmer la reception'}
          </button>
        </div>
      </div>
    </form>
  );
}
