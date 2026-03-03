"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SelectOrgPage() {
  const router = useRouter();

  // Selection of or request to join an organization now happens from the dashboard.
  // This page simply redirects users to the dashboard. Keep a visible link
  // for users with JS disabled.
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-lg font-semibold mb-3">Choisir une organisation</h2>
      <p className="mb-4 text-sm text-slate-600">La sélection ou la demande d'adhésion à une organisation se fait désormais depuis votre tableau de bord.</p>
      <div className="flex gap-3">
        <Link href="/dashboard" className="btn btn-primary">Aller au tableau de bord</Link>
      </div>
    </div>
  );
}
