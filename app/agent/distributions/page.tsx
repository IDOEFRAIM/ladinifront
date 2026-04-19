import SeedDistributionForm from '@/components/SeedDistributionForm';
import { db, schema } from '@/src/db';

export default async function Page() {
  // fetch some allocations to show in the UI
  let rows: any[] = [];
  let dbError: any = null;
  try {
    rows = await db.select().from(schema.seedAllocations).limit(50);
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

      {dbError ? (
        <div style={{ color: 'crimson', marginBottom: 12 }}>
          Error loading allocations: {(dbError && dbError.message) || 'unknown error'}. Check server logs.
        </div>
      ) : null}

      <SeedDistributionForm allocations={data} />
    </div>
  );
}
