"use server";

import { revalidatePath } from 'next/cache';
import { createProductFromForm, updateProductFromForm } from './products.server';
import { requireProducer } from '@/lib/api-guard';

// ── Shared auth guard ──────────────────────────────────────────────────
async function getProducerId(): Promise<string> {
  const { user, error } = await requireProducer();
  if (error || !user) {
    const err = new Error('Unauthorized');
    (err as any).status = 401;
    throw err;
  }
  return (user.producerId || user.id) as string;
}

// ── Server actions ─────────────────────────────────────────────────────

export async function createProductAction(formData: FormData) {
  try {
    const producerId = await getProducerId();
    await createProductFromForm(formData, producerId);
    
    // ⚡ On invalide le cache sur le serveur pour forcer le rafraîchissement global
    revalidatePath('/products');
    
    // On renvoie le succès au client sans bloquer avec un redirect() serveur
    return { success: true };
  } catch (err: any) {
    console.error('createProductAction failed:', err?.message ?? err, { 
      validation: err?.validation, 
      raw: err?.raw 
    });
    return { 
      success: false, 
      error: err?.message ?? "Erreur lors de la création du produit" 
    };
  }
}

export async function updateProductAction(formData: FormData) {
  try {
    const producerId = await getProducerId();
    await updateProductFromForm(formData, producerId);
    
    revalidatePath('/products');
    
    return { success: true };
  } catch (err: any) {
    console.error('updateProductAction failed:', err?.message ?? err, { 
      validation: err?.validation, 
      raw: err?.raw 
    });
    return { 
      success: false, 
      error: err?.message ?? "Erreur lors de la modification du produit" 
    };
  }
}