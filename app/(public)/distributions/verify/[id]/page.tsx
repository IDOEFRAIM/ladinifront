"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import DistributionReceiptForm from '@/components/DistributionReceiptForm';

export default function PageClient() {
  const params = useParams() as { id?: string } | null;
  const router = useRouter();
  const pathname = usePathname();
  const id = params?.id;
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'same-origin' });
        if (!mounted) return;
        if (res.ok) setMe(await res.json());
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!id) return <div className="p-6">Distribution invalide ou manquante.</div>;

  if (!me) {
    return (
      <div className="p-6">
        <p>Vous devez être connecté pour confirmer la distribution.</p>
        <p style={{ marginTop: 8 }}>
          <a href={`/login?next=${encodeURIComponent(pathname || '/')}`} style={{ color: '#0ea5e9' }}>Se connecter</a>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Confirmer la réception</h1>
      <DistributionReceiptForm distributionId={id} />
    </div>
  );
}
