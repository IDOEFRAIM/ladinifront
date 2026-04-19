"use client";
import React, { useState } from 'react';

export default function DistributionReceiptForm({ distributionId }: { distributionId: string }) {
  const [code, setCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (file) {
        const fd = new FormData();
        fd.append('distributionId', distributionId);
        fd.append('file', file);
        const res = await fetch('/api/uploads/cnib', { method: 'POST', body: fd });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || 'upload_failed');
        }
      }

      const verifyRes = await fetch('/api/inventory/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionId, code }),
      });
      const j = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !j.ok) {
        setMessage('Code verification failed');
      } else {
        setMessage('Verified successfully');
      }
    } catch (err: any) {
      setMessage(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Verification code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 block w-full rounded border px-2 py-1"
          placeholder="Enter code"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Upload CNIB (optional)</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-1"
        />
      </div>

      <div>
        <button type="submit" disabled={loading} className="inline-flex items-center rounded bg-sky-600 px-3 py-1 text-white">
          {loading ? 'Submitting...' : 'Confirm & Upload'}
        </button>
      </div>

      {message ? <div className="text-sm mt-2">{message}</div> : null}
    </form>
  );
}
