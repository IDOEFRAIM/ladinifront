import React from 'react';
import { getOpenAuctions } from '@/services/auction.service';
import AuctionCard from '@/components/auction/AuctionCard'; // On importe le composant client

export default async function AuctionListingPage() {
  // 1. Récupération des données sur le serveur (SÉCURISÉ)
  const auctions = await getOpenAuctions();

  return (
    <main className="p-6 min-h-screen bg-[#F9FBF8]">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold text-[#064E3B] mb-8">Enchères ouvertes</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((a) => (
            // 2. On transmet les données au composant Client
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      </div>
    </main>
  );
}