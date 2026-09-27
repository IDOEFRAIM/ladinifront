'use server';

// Clients du producteur connecté — le producteur est TOUJOURS celui de la session.
import { z } from 'zod';
import { getAccessContext } from '@/lib/api-guard';
import { secureAction } from '@/lib/action-guard';
import { CreateClientSchema, createClient as insertClient, type CreateClientInput } from '@/features/clients/services/clients.service';

export async function createClient(input: CreateClientInput) {
  return secureAction({ access: 'producer', schema: z.tuple([CreateClientSchema]) }, [input], async (data) => {
    const { ctx } = await getAccessContext();
    if (!ctx?.producerId) return { success: false as const, error: 'Profil producteur requis.' };
    return { success: true as const, data: await insertClient(ctx.producerId, data) };
  });
}
