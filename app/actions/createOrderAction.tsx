"use server";
import { cookies } from 'next/headers';
import { createOrderFromForm } from './orders.server';
import { getSessionFromRequest } from '@/lib/session';

export async function createOrderAction(formData: FormData) {
  const cookieStore = await cookies();
  const session = await getSessionFromRequest({ cookies: cookieStore } as any);
  // optionally validate session or allow guest orders
  // perform order creation but do not return a value (form actions should return void)
  await createOrderFromForm(formData);
  return;
}

// Named export only — server actions must export async functions directly
