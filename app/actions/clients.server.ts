// app/actions/clients.server.ts
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

export async function fetchClients() {
  const clients = await db.query.clients.findMany({ orderBy: (t, ops) => [ops.desc(t.createdAt)] });
  return clients;
}

export async function createClient(data: any) {
  const [client] = await db.insert(schema.clients).values(data).returning();
  return client;
}
