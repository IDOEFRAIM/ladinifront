import NewAuctionClient from "@/components/auction/NewAuctionClient"; // Ajuste le chemin
import { createAuction } from "@/services/auction.service"; // Ton service d'enchères
import { db } from "@/src/db";
import * as schema from "@/src/db/schema";
import { eq } from 'drizzle-orm';

export default async function NewAuctionPage() {
  
  /**
   * SERVER ACTION : Passée au composant client
   * Elle permet de créer l'enchère sans exposer d'URL d'API publique
   */
  async function handleCreate(payload: any) {
    "use server";
    
    // On appelle ton service que tu as défini précédemment
    const result = await createAuction({
      subCategoryId: payload.subCategoryId,
      quantity: payload.quantity,
      unit: payload.unit.toUpperCase(), // Conversion 'kg' -> 'KG' pour matcher l'Enum
      maxPricePerUnit: payload.maxPricePerUnit,
      deadline: payload.deadline,
      targetZoneId: payload.targetZoneId,
    });

    return result;
  }

  // Optionnel : Tu pourrais charger ici la liste des catégories ou des zones
  // pour les passer en props et transformer tes inputs texte en <select>
  const subCategories = await db.query.subCategories.findMany({ columns: { id: true, name: true }, orderBy: (t, { asc }) => [asc(t.name)] });
  const zones = await db.query.zones.findMany({ where: eq(schema.zones.isActive, true), columns: { id: true, name: true }, orderBy: (t, { asc }) => [asc(t.name)] });

  return (
    <main className="min-h-screen bg-[#F9FBF8] py-12">
      <NewAuctionClient serverCreateAuction={handleCreate} subCategories={subCategories} zones={zones} />
    </main>
  );
}