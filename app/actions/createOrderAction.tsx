"use server";

import { cookies } from 'next/headers';
import { createOrderFromForm } from './orders.server';
import { getSessionFromRequest } from '@/lib/session';

/**
 * Action Serveur pour la création d'une commande.
 * Cette fonction sert de pont sécurisé entre l'UI et la logique métier (orders.server).
 */
export async function createOrderAction(formData: FormData) {
  try {
    // 1. Récupération et vérification de la session
    const cookieStore = await cookies();
    const session = await getSessionFromRequest({ cookies: cookieStore } as any);

    if (!session?.userId) {
      return { 
        success: false, 
        error: "Vous devez être connecté pour finaliser votre commande." 
      };
    }

    // 2. Appel au service de création de commande
    // On passe session.userId pour garantir le lien Buyer <-> Order
    const result = await createOrderFromForm(formData, session.userId);

    // 3. Retourner le succès et l'ID pour le suivi client
    // Il est crucial de renvoyer l'orderId pour que le client puisse suivre l'état de sa commande.
    return {
      success: true,
      orderId: result.orderId,
      message: "Commande créée avec succès."
    };

  } catch (error: any) {
    // 4. Gestion centralisée des erreurs
    console.error("Erreur dans createOrderAction:", error);

    // Traduction des codes d'erreur techniques en messages utilisateur
    let errorMessage = "Une erreur inattendue est survenue.";

    if (error.message === 'PRODUCT_UNAVAILABLE') {
      errorMessage = "Un ou plusieurs produits ne sont plus disponibles en stock.";
    } else if (error.message === 'PRICE_MISMATCH_FRAUD_DETECTED') {
      errorMessage = "Erreur de validation des prix. Veuillez rafraîchir votre panier.";
    } else if (error.message === 'INVALID_VALUES_ABERRANT') {
      errorMessage = "Les quantités ou montants indiqués sont invalides.";
    } else if (error.message === 'AUDIO_TOO_LARGE') {
      errorMessage = "La note vocale est trop volumineuse (max 5 Mo).";
    }

    return { 
      success: false, 
      error: errorMessage 
    };
  }
}