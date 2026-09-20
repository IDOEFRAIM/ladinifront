import OrdersList from '@/features/orders/components/OrdersList';
import { THEME_COLORS as C, THEME_FONTS as F } from '@/lib/theme';

import type { getBuyerOrders } from '@/features/orders/services/buyer-orders.service';

type ListOrders = Parameters<typeof OrdersList>[0]['orders'];
type ServiceOrders = Extract<Awaited<ReturnType<typeof getBuyerOrders>>, { kind: 'ok' }>['orders'];

/** En-tête + liste des commandes de l'acheteur (composant serveur, aucun état). */
export default function BuyerOrdersView({ orders: formattedOrders }: { orders: ServiceOrders }) {
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
        {/* Écart historique (montants numeric renvoyés en string par Drizzle) : cast conservé, comme l'ancien `as any`. */}
        <OrdersList orders={formattedOrders as unknown as ListOrders} />
      </main>
    </div>
  );
}
