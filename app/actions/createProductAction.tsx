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
    
    // Force la mise à jour des données partout où les produits sont affichés
    revalidatePath('/products');
    
    // On retourne un statut de succès au lieu de redirect()
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
    
    // Invalide le cache de la liste des produits
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