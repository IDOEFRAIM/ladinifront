import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count, desc } from 'drizzle-orm';
import { assertAdmin } from '@/features/admin/services/admin-guard';

export async function getAdminProducts() {
  try {
    await assertAdmin();
    // Fetch products with producer relation
    interface ProductWithProducer {
      id: string;
      shortCode: string | null;
      name: string;
      categoryLabel: string;
      price: string;
      unit: string;
      quantityForSale: string;
      createdAt: Date;
      updatedAt: Date;
      producer: {
        businessName: string | null;
        zone: { name: string } | null;
      } | null;
    }

    const productsRaw = await db.query.products.findMany({
      with: {
        producer: {
          columns: { businessName: true },
          with: { 
            zone: { 
              columns: { name: true } 
            } 
          },
        },
      },
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    }) as ProductWithProducer[];

    // Count order items per product
    const orderItemCounts = await db
      .select({ productId: schema.orderItems.productId, count: count() })
      .from(schema.orderItems)
      .groupBy(schema.orderItems.productId);

    const orderItemCountMap = new Map(orderItemCounts.map(r => [r.productId, Number(r.count)]));

    interface AdminProduct {
      id: string;
      shortCode: string;
      name: string;
      categoryLabel: string;
      price: number;
      unit: string;
      quantityForSale: number;
      producerName: string;
      location: string;
      totalOrders: number;
      createdAt: string;
      updatedAt: string;
    }

    interface AdminProductsResponse {
      success: true;
      data: AdminProduct[];
    }

    const formattedProducts: AdminProduct[] = productsRaw.map((p: ProductWithProducer): AdminProduct => ({
      id: p.id,
      shortCode: p.shortCode || '',
      name: p.name,
      categoryLabel: p.categoryLabel,
      price: Number(p.price),
      unit: p.unit,
      quantityForSale: Number(p.quantityForSale),
      producerName: p.producer?.businessName || 'Inconnu',
      location: p.producer?.zone?.name || 'Non assigné',
      totalOrders: orderItemCountMap.get(p.id) ?? 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: formattedProducts
    } as AdminProductsResponse;
  } catch (error) {
    console.error("Erreur chargement produits admin:", error);
    return { success: false, error: "Impossible de charger les produits." };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  VALIDATIONS (PENDING)                       ║
// ╚══════════════════════════════════════════════╝

export async function getAdminValidations() {
  try {
    await assertAdmin();
    // 1. Récupération des producteurs en attente avec leurs relations
    const pendingProducers = await db.query.producers.findMany({
      where: eq(schema.producers.status, 'PENDING'),
      with: {
        user: { 
          columns: { 
            name: true, 
            email: true, 
            phone: true, 
            createdAt: true 
          } 
        },
        zone: { 
          columns: { 
            name: true 
          } 
        },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    // 2. Formatage des données avec protection contre les valeurs nulles
    const validations = pendingProducers.map((p) => {
      // On prépare des fallback pour éviter les erreurs de lecture
      const userName = p.user?.name || 'Utilisateur sans nom';
      const userEmail = p.user?.email || 'Email non renseigné';
      const userPhone = p.user?.phone || 'Pas de numéro';
      const zoneName = p.zone?.name || 'Zone non définie';

      return {
        id: p.id,
        entityId: p.id,
        type: 'PRODUCER' as const, // Match avec ton type TabKey côté client
        title: p.businessName || userName,
        details: `${userEmail} • ${zoneName}`, // Ajout du champ details attendu par le client
        name: p.businessName || userName,     // Ajout du champ name attendu par le client
        producerName: `${userEmail} • ${zoneName}`,
        submissionDate: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        date: p.createdAt ? p.createdAt.toLocaleDateString('fr-FR') : 'Date inconnue', // Pour l'affichage direct
        priority: 'high' as const,
        status: 'PENDING' as const,
        metadata: {
          phone: userPhone,
          riskLevel: 'safe' as const,
        }
      };
    });

    // Optionnel: Tu pourrais aussi fetch les produits en attente ici 
    // et les concaténer à la liste 'validations'

    return { 
      success: true, 
      data: validations 
    };

  } catch (error) {
    // On log l'erreur réelle pour le debug mais on renvoie un message propre
    console.error("DÉTAIL ERREUR VALIDATIONS:", error);
    return { 
      success: false, 
      error: "Erreur lors de la récupération des dossiers de validation." 
    };
  }
}
