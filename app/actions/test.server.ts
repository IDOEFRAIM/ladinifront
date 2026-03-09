import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

export async function fetchProducersForTest() {
  const producers = await db.query.producers.findMany({
    columns: { id: true, userId: true, businessName: true, status: true },
    with: { user: { columns: { id: true, name: true, email: true } } },
    orderBy: (t, { asc }) => [asc(t.businessName)],
  });

  return producers;
}

export async function fetchUsersForTest() {
  const users = await db.query.users.findMany({
    columns: { id: true, name: true, email: true },
    orderBy: (t, { asc }) => [asc(t.name)],
  });

  return users;
}
