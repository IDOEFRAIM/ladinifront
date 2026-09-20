'use server';

// Création / modification de produit (producteur).
// Garde : secureAction `access: 'producer'` (même règle que l'inventaire) ; la propriété du produit
// est revérifiée par le service pour la modification.
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getAccessContext } from '@/lib/api-guard';
import { secureAction } from '@/lib/action-guard';
import { errorMessage } from '@/lib/api-result';
import { createProductFromForm, updateProductFromForm } from '@/features/products/services/product-form.service';

const formDataArg = z.instanceof(FormData, { message: 'Formulaire invalide.' });

// Détails de validation éventuellement attachés par le service (Zod) — journalisés côté serveur uniquement.
function errorDetails(err: unknown): Record<string, unknown> {
  if (typeof err !== 'object' || err === null) return {};
  const { validation, raw } = err as { validation?: unknown; raw?: unknown };
  return { validation, raw };
}

async function currentProducerId(): Promise<string> {
  const { ctx } = await getAccessContext();
  if (!ctx) throw new Error('Unauthorized');
  return ctx.producerId ?? ctx.userId;
}

export async function createProductAction(formData: FormData) {
  return secureAction({ access: 'producer', schema: z.tuple([formDataArg]) }, [formData], async (form) => {
    try {
      await createProductFromForm(form, await currentProducerId());
      revalidatePath('/products'); // invalide le cache pour rafraîchir la liste sans redirect serveur
      return { success: true as const, data: null };
    } catch (err: unknown) {
      console.error('createProductAction failed:', errorMessage(err, ''), errorDetails(err));
      return { success: false as const, error: errorMessage(err, 'Erreur lors de la création du produit') };
    }
  });
}

export async function updateProductAction(formData: FormData) {
  return secureAction({ access: 'producer', schema: z.tuple([formDataArg]) }, [formData], async (form) => {
    try {
      await updateProductFromForm(form, await currentProducerId());
      revalidatePath('/products');
      return { success: true as const, data: null };
    } catch (err: unknown) {
      console.error('updateProductAction failed:', errorMessage(err, ''), errorDetails(err));
      return { success: false as const, error: errorMessage(err, 'Erreur lors de la modification du produit') };
    }
  });
}
