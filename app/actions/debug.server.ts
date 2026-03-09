import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function checkUserInDb(userId?: string) {
  const id = userId || 'fa987f63-fafa-4147-9676-52c9af0edc75';

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, id),
    columns: { id: true, name: true, email: true },
  });

  let dbInfo: any = null;
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      dbInfo = {
        host: parsed.hostname,
        port: parsed.port,
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : null,
        protocol: parsed.protocol,
      };
    } catch (e: any) {
      dbInfo = { parseError: String(e.message || e) };
    }
  }

  return { user, dbInfo };
}
