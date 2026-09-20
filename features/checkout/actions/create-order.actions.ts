'use server';

// Checkout — création d'une commande. Pont sécurisé entre l'UI et la logique métier (order-form.service).
// Garde : session + rôle acheteur (mêmes rôles que le middleware pour /checkout) ; l'acheteur enregistré
// est TOUJOURS celui de la session, jamais une valeur fournie par le client.
import { z } from 'zod';
import { getAccessContext } from '@/lib/api-guard';
import { secureAction } from '@/lib/action-guard';
import { createOrderFromForm } from '@/features/orders/services/order-form.service';

const CHECKOUT_ROLES = ['BUYER', 'PRODUCER', 'ADMIN', 'SUPERADMIN'] as const;
const formDataArg = z.instanceof(FormData, { message: 'Formulaire invalide.' });

// Traduction des codes d'erreur techniques du service en messages utilisateur.
const ERROR_MESSAGES: Record<string, string> = {
  PRODUCT_UNAVAILABLE: 'Un ou plusieurs produits ne sont plus disponibles en stock.',
  PRICE_MISMATCH_FRAUD_DETECTED: 'Erreur de validation des prix. Veuillez rafraîchir votre panier.',
  INVALID_VALUES_ABERRANT: 'Les quantités ou montants indiqués sont invalides.',
  AUDIO_TOO_LARGE: 'La note vocale est trop volumineuse (max 5 Mo).',
};

export async function createOrderAction(formData: FormData) {
  return secureAction({ roles: CHECKOUT_ROLES, schema: z.tuple([formDataArg]) }, [formData], async (form) => {
    try {
      const { ctx } = await getAccessContext();
      if (!ctx) return { success: false as const, error: 'Vous devez être connecté pour finaliser votre commande.' };

      const result = await createOrderFromForm(form, ctx.userId);
      // L'orderId permet au client de suivre l'état de sa commande.
      return { success: true as const, data: { orderId: result.orderId, message: 'Commande créée avec succès.' } };
    } catch (error: unknown) {
      console.error('Erreur dans createOrderAction:', error);
      const code = error instanceof Error ? error.message : '';
      return { success: false as const, error: ERROR_MESSAGES[code] ?? 'Une erreur inattendue est survenue.' };
    }
  });
}
