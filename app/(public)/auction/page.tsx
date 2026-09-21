import React from 'react';
import { queryOpenAuctions } from '@/features/auction/services/auction.service';
import AuctionCard from '@/features/auction/components/AuctionCard'; // On importe le composant client
import Link from 'next/link';
import { Plus, Gavel, WifiOff } from 'lucide-react';

export const dynamic = 'force-dynamic';
export default async function AuctionListingPage() {
  // 1. Récupération des données sur le serveur (SÉCURISÉ)
  // Lecture stricte : « aucune enchère » et « chargement impossible » sont deux situations différentes.
  let auctions: Awaited<ReturnType<typeof queryOpenAuctions>> = [];
  let loadFailed = false;
  try {
    auctions = await queryOpenAuctions();
  } catch (e) {
    console.error('AuctionListingPage: chargement impossible', e);
    loadFailed = true;
  }

  return (
    <main className="px-4 py-6 sm:p-6 min-h-screen bg-[#F9FBF8]">
      <div className="max-w-6xl mx-auto">
        {/* Mobile : titre puis bouton pleine largeur. ≥ 640 px : titre à gauche, bouton à droite. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#064E3B] leading-tight">Enchères ouvertes</h1>
            <p className="mt-1 text-sm text-slate-500">
              {loadFailed
                ? 'Le chargement a échoué.'
                : auctions.length > 0
                ? `${auctions.length} enchère${auctions.length > 1 ? 's' : ''} en cours — proposez votre prix avant la fin du compte à rebours.`
                : 'Les acheteurs publient ici leurs besoins ; les producteurs répondent en proposant un prix.'}
            </p>
          </div>
          <Link
            href="/auction/new"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#064E3B] text-white text-sm font-bold shadow-sm hover:bg-[#0a6b52] active:scale-[0.98] transition"
          >
            <Plus size={18} aria-hidden="true" /> Créer une enchère
          </Link>
        </div>

        {loadFailed ? (
          <div role="alert" className="flex flex-col items-center text-center rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-amber-600">
              <WifiOff size={26} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-[#064E3B]">Impossible de charger les enchères</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-600">La connexion au serveur a été interrompue. Cela ne signifie pas qu&apos;il n&apos;y a pas d&apos;enchère : réessayez dans un instant.</p>
            <Link href="/auction" className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#064E3B] px-5 py-2 text-sm font-bold text-white hover:bg-[#0a6b52]">Réessayer</Link>
          </div>
        ) : auctions.length === 0 ? (
          <div className="flex flex-col items-center text-center rounded-2xl border border-emerald-900/5 bg-white px-6 py-14 shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Gavel size={26} aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-[#064E3B]">Aucune enchère ouverte pour le moment</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Soyez le premier à publier un besoin : décrivez le produit, la quantité et votre prix maximum.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {auctions.map((a) => (
              // 2. On transmet les données au composant Client
              <AuctionCard key={a.id} auction={a} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
