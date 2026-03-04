/**
 * DATABASE RE-EXPORT — AgriConnect v3 (Drizzle)
 * ══════════════════════════════════════════════════════════════════════════
 * Drop-in replacement for the old Prisma singleton.
 * All imports of `@/lib/prisma` now receive the Drizzle db + schema.
 */

export { db, schema } from '@/src/db';
export type { DB } from '@/src/db';