import SeedDistributionForm from '@/components/SeedDistributionForm';
import { db, schema } from '@/src/db';
import { getOrgMembers } from '@/services/org-manager.service';
import { cookies } from 'next/headers';
import { getSessionFromRequest } from '@/lib/session';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const cookieStore = await cookies();
  const session = await getSessionFromRequest({ cookies: cookieStore } as any);
  const activeOrgId = cookieStore.get(COOKIE_NAMES.ACTIVE_ORG_ID)?.value ?? session?.activeOrgId ?? null;

  // load allocations for the active org (server-side)
  let allocations: any[] = [];
  try {
    if (!activeOrgId) {
      allocations = [];
    } else {
      const rows = await db.select().from(schema.seedAllocations).where(eq(schema.seedAllocations.organizationId, activeOrgId)).limit(100);
      allocations = (rows || []).map((a: any) => ({
        id: a.id,
        seedType: a.seedType,
        remainingQuantity: a.remainingQuantity,
        organizationId: a.organizationId ?? a.orgId ?? null,
        zoneId: a.zoneId ?? a.zone ?? null,
      }));
    }
  } catch (e) {
    console.error('[org/distributions/create] failed loading allocations', e);
    allocations = [];
  }

  // load members via service (server-side) - returns { success, data }
  let members: any[] = [];
  try {
    if (activeOrgId) {
      const m = await getOrgMembers();
      if (m.success && Array.isArray(m.data)) members = m.data;
    }
  } catch (e) {
    console.error('[org/distributions/create] failed loading members', e);
    members = [];
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Create Distribution (Admin)</h1>
      {!activeOrgId ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'white', color: 'var(--muted)' }}>
          No active organization selected.
        </div>
      ) : null}
      <SeedDistributionForm allocations={allocations} members={members} />
    </div>
  );
}
