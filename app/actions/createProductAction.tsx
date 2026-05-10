"use server";
import { redirect } from 'next/navigation';
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
  const producerId = await getProducerId();
  try {
    await createProductFromForm(formData, producerId);
  } catch (err: any) {
    console.error('createProductAction failed', err?.message ?? err, { validation: err?.validation, raw: err?.raw });
    throw err;
  }

  // La redirection doit être en dehors du bloc try/catch 
  // car redirect() lance techniquement une erreur interne à Next.js
  redirect('/products');
}

export async function updateProductAction(formData: FormData) {
  const producerId = await getProducerId();
  try {
    await updateProductFromForm(formData, producerId);
  } catch (err: any) {
    console.error('updateProductAction failed', err?.message ?? err, { validation: err?.validation, raw: err?.raw });
    throw err;
  }

  redirect('/products');
}