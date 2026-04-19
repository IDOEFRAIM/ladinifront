import SeedDistributionForm from '@/components/SeedDistributionForm';
import { db, schema } from '@/src/db';
import { getOrgMembers } from '@/services/org-manager.service';

export default async function Page() {
  // load allocations for the active org (server-side)
  let allocations: any[] = [];
  try {
    const rows = await db.select().from(schema.seedAllocations).limit(100);
    allocations = (rows || []).map((a: any) => ({
      id: a.id,
      seedType: a.seedType,
      remainingQuantity: a.remainingQuantity,
      organizationId: a.organizationId ?? a.orgId ?? null,
      zoneId: a.zoneId ?? a.zone ?? null,
    }));
  } catch (e) {
    console.error('[org/distributions/create] failed loading allocations', e);
    allocations = [];
  }

  // load members via service (server-side) - returns { success, data }
  let members: any[] = [];
  try {
    const m = await getOrgMembers();
    if (m.success && Array.isArray(m.data)) members = m.data;
  } catch (e) {
    console.error('[org/distributions/create] failed loading members', e);
    members = [];
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Create Distribution (Admin)</h1>
      <SeedDistributionForm allocations={allocations} members={members} />
    </div>
  );
}
