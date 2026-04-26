import { notFound } from 'next/navigation';
import AuctionClient from '@/components/auction/AuctionClient'; 
import { getAuctionById, getEligibleProducers } from '@/services/auction.service'; 

interface AuctionPageProps {
  params: Promise<{ id: string }>;
}

export default async function AuctionPage({ params }: AuctionPageProps) {
  // 1. Unwrapping des params
  const { id } = await params;

  // 2. Récupération des données (CORRECTION ICI)
  const [auctionRes, producersRes] = await Promise.all([
    getAuctionById(id),
    // On passe un OBJET car le service attend { auctionId: string }
    getEligibleProducers({ auctionId: id }) 
  ]);

  // 3. Vérification des résultats
  // On vérifie si auctionRes existe (ton getAuctionById devrait renvoyer l'objet ou null)
  if (!auctionRes) {
    notFound();
  }

  // On extrait les données du résultat du matching
  const initialProducers = producersRes.success ? producersRes.data : [];

  return (
    <main className="bg-[#F9FBF8] min-h-screen">
      <AuctionClient 
        auctionId={id} 
        initialAuction={auctionRes} 
        initialProducers={initialProducers}
      />
    </main>
  );
}