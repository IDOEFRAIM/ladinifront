"use server";
import { cookies } from 'next/headers';
import { createOrderFromForm } from './orders.server';
import { getSessionFromRequest } from '@/lib/session';

export async function createOrderAction(formData: FormData) {
  const cookieStore = await cookies();
  const session = await getSessionFromRequest({ cookies: cookieStore } as any);
  if (!session?.userId) {
    const e: any = new Error('UNAUTHENTICATED');
    e.code = 'UNAUTHENTICATED';
    throw e;
  }
  // Pass userId so the order is linked to the buyer's profile
  // (without this, buyerId is null and orders never appear in buyer dashboard)
  await createOrderFromForm(formData, session.userId);
  return;
}

// Named export only — server actions must export async functions directly
