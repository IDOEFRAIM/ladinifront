'use server';

// Commandes — détail d'une commande. Ancienne version : AUCUN contrôle de propriété
// (n'importe quel visiteur pouvait lire nom, téléphone et adresse d'une commande par son id).
import { z } from 'zod';
import { getAccessContext } from '@/lib/api-guard';
import { secureAction, idArg } from '@/lib/action-guard';
import { getOrderDetails as loadOrderDetails } from '@/features/orders/services/orders.service';
import { canAccessOrder } from '@/features/orders/services/order-access';

export async function getOrderDetails(orderId: string) {
  return secureAction({ schema: z.tuple([idArg]) }, [orderId], async (id) => {
    const { ctx } = await getAccessContext();
    const order = await loadOrderDetails(id);
    if (!ctx || !order) return null;
    return (await canAccessOrder(ctx, order)) ? order : null;
  });
}
