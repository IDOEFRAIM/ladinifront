import { OrdersEmptyState, OrdersAccessRequired } from './OrderAcces';
import OrdersList from './OrderList';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';

const C = { 
  forest:'#064E3B', 
  emerald:'#10B981', 
  amber:'#D97706', 
  sand:'#F9FBF8', 
  glass:'rgba(255,255,255,0.72)', 
  border:'rgba(6,78,59,0.07)', 
  muted:'#64748B', 
  text:'#1F2937' 
};
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

export default async function OrdersPage() {
  // 1. Vérification de l'accès
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) return <OrdersAccessRequired />;

  // 2. Récupération du profil acheteur
  const buyerProfile = await db.query.buyerProfiles.findFirst({
    where: eq(schema.buyerProfiles.userId, ctx.userId),
    columns: { id: true },
  });

  if (!buyerProfile) return <OrdersEmptyState />;

  // 3. Chargement optimisé (Une seule requête relationnelle)
  const userOrders = await db.query.orders.findMany({
    where: eq(schema.orders.buyerId, buyerProfile.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: {
      items: {
        with: {
          product: true, // Récupère les infos produit direct
        }
      },
      delivery: true, // Récupère les infos de livraison direct
    },
  });

  if (userOrders.length === 0) return <OrdersEmptyState />;

  // 4. Formatage propre pour le client (Conversion Dates et Numbers)
  const formattedOrders = userOrders.map(order => ({
    ...order,
    // On s'assure que la date est une string pour éviter les erreurs de sérialisation Client
    createdAt: order.createdAt instanceof Date 
      ? order.createdAt.toISOString() 
      : new Date(order.createdAt).toISOString(),
    
    items: order.items.map(item => ({
      ...item,
      priceAtSale: Number(item.priceAtSale),
      // On s'assure que l'objet product est bien structuré comme attendu par OrdersList
      product: item.product ? {
        name: item.product.name,
        unit: item.product.unit,
        images: item.product.images as string[] || [],
      } : null,
    })),
    
    // On passe la livraison telle quelle (ou null)
    delivery: order.delivery ? {
      ...order.delivery,
      // Conversion optionnelle si tes champs DB sont des Decimal
      estimatedDistanceKm: order.delivery.estimatedDistanceKm ? Number(order.delivery.estimatedDistanceKm) : null
    } : null,
  }));

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end', 
        marginBottom: 32,
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: 20
      }}>
        <div>
          <h1 style={{ 
            fontFamily: F.heading, 
            fontSize: '2rem', 
            fontWeight: 900, 
            color: C.forest, 
            letterSpacing: '-0.03em',
            margin: 0 
          }}>
            Mes Commandes
          </h1>
          <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.9rem', marginTop: 4 }}>
            Historique et suivi de vos achats agricoles
          </p>
        </div>
        
        <div style={{ 
          background: 'white', 
          border: `1px solid ${C.border}`,
          padding: '8px 16px', 
          borderRadius: 12, 
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <span style={{ color: C.emerald, fontFamily: F.body, fontSize: '0.85rem', fontWeight: 800 }}>
            {formattedOrders.length}
          </span>
          <span style={{ color: C.muted, fontFamily: F.body, fontSize: '0.85rem', fontWeight: 600, marginLeft: 6 }}>
            {formattedOrders.length > 1 ? 'commandes' : 'commande'}
          </span>
        </div>
      </header>

      <main>
        <OrdersList orders={formattedOrders as any} />
      </main>
    </div>
  );
}