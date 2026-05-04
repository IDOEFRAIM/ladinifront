import SeedDistributionForm from '@/components/SeedDistributionForm';
import { db, schema } from '@/src/db';
import { cookies } from 'next/headers';
import { getSessionFromRequest } from '@/lib/session';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const session = await getSessionFromRequest({ cookies: cookieStore } as any);
  const activeOrgId = cookieStore.get(COOKIE_NAMES.ACTIVE_ORG_ID)?.value ?? session?.activeOrgId ?? null;

  // fetch some allocations to show in the UI
  let rows: any[] = [];
  let dbError: any = null;
  try {
    rows = activeOrgId
      ? await db.select().from(schema.seedAllocations).where(eq(schema.seedAllocations.organizationId, activeOrgId)).limit(50)
      : [];
  } catch (err) {
    dbError = err;
    // eslint-disable-next-line no-console
    console.error('[agent/distributions] DB query failed:', err);
    rows = [];
  }

  // serialize allocations for client
  const data = (rows || []).map((a: any) => ({ id: a.id, seedType: a.seedType, remainingQuantity: a.remainingQuantity }));

  return (
    <div style={{ padding: 20 }}>
      <h1>Agent — Distributions</h1>
      <p>Select an allocation, enter producer ID and quantity, then create distribution.</p>

      {!activeOrgId ? (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'white', color: 'var(--muted)' }}>
          No active organization selected.
        </div>
      ) : null}

      {dbError ? (
        <div style={{ color: 'crimson', marginBottom: 12 }}>
          Error loading allocations: {(dbError && dbError.message) || 'unknown error'}. Check server logs.
        </div>
      ) : null}

      <SeedDistributionForm allocations={data} />
    </div>
  );
}
