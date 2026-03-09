"use server";
import { cookies } from 'next/headers';
import { createProductFromForm, updateProductFromForm } from './products.server';
import { requireProducer } from '@/lib/api-guard';

export async function createProductAction(formData: FormData) {
  // Use requireProducer to build full access context and guarantee producerId
  const { user, error } = await requireProducer();
  if (error || !user) {
    const err = new Error('Unauthorized');
    (err as any).status = 401;
    throw err;
  }
  const producerId = user.producerId || user.id;

  try {
    await createProductFromForm(formData, producerId as string);
    return;
  } catch (err: any) {
    console.error('createProductAction failed', err?.message ?? err, { validation: err?.validation, raw: err?.raw });
    throw err;
  }
}


export async function updateProductAction(formData: FormData) {
  const { user, error } = await requireProducer();
  if (error || !user) {
    const err = new Error('Unauthorized');
    (err as any).status = 401;
    throw err;
  }

  // Ensure the server-side update function will validate ownership internally
  try {
    await updateProductFromForm(formData, user.producerId || user.id);
    return;
  } catch (err: any) {
    console.error('updateProductAction failed', err?.message ?? err, { validation: err?.validation, raw: err?.raw });
    throw err;
  }
}

// Named exports only — server actions must export async functions directly
