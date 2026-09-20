// Carnet de clients d'un producteur.
// Ancienne version : fetchClients() renvoyait TOUS les clients de TOUS les producteurs et createClient()
// insérait n'importe quel objet (dont producerId) sans aucune vérification — accessible sans session via
// /api/clients. Désormais chaque lecture/écriture est bornée au producteur fourni par la session.
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

export const CreateClientSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(200),
  phone: z.string().trim().min(6, 'Téléphone requis').max(30),
  email: z.string().trim().email().max(255).optional().nullable(),
  location: z.string().trim().max(300).optional().nullable(),
  taxId: z.string().trim().max(50).optional().nullable(),
});
export type CreateClientInput = z.infer<typeof CreateClientSchema>;

export async function listClients(producerId: string) {
  return db.query.clients.findMany({
    where: eq(schema.clients.producerId, producerId),
    orderBy: () => [desc(schema.clients.createdAt)],
  });
}

export async function createClient(producerId: string, input: CreateClientInput) {
  const data = CreateClientSchema.parse(input); // champs whitelistés : pas de producerId ni de compteurs fournis par le client
  const [client] = await db
    .insert(schema.clients)
    .values({ ...data, producerId })
    .returning();
  return client;
}
