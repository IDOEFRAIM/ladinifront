import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import getUserIdFromSession from '@/lib/get-userId';

export async function assertAdmin() {
  const userId = await getUserIdFromSession();
  if (!userId) throw new Error('Session expirée');
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { role: true } });
  const role = String(user?.role ?? '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') throw new Error('Accès réservé aux administrateurs');
  return userId;
}
