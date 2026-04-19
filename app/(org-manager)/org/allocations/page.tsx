import { db, schema } from '@/src/db';
import Link from 'next/link';
import AllocationRow from '@/components/AllocationRow';

export default async function Page() {
  let rows: any[] = [];
  try {
    rows = await db.select().from(schema.seedAllocations).limit(200);
  } catch (e) {
    console.error('[org/allocations] failed to load allocations', e);
    rows = [];
  }

  const allocations = (rows || []).map((r: any) => ({
    id: r.id,
    seedType: r.seedType,
    totalQuantity: r.totalQuantity,
    remainingQuantity: r.remainingQuantity,
    zoneId: r.zoneId,
    allocatedById: r.allocatedById,
    createdAt: r.createdAt?.toString?.() ?? String(r.createdAt),
  }));

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1>Allocations</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/org/allocations/create"><button style={{ background: 'var(--foreground)', color: 'white', padding: '8px 12px', borderRadius: 8, border: 'none' }}>New allocation</button></Link>
          <Link href="/org/distributions/create"><button style={{ background: 'transparent', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 8 }}>Create distribution</button></Link>
        </div>
      </div>

      {allocations.length === 0 ? (
        <div style={{ padding: 20, background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
          No allocations found. Create one using the button above.
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: 12 }}>Seed type</th>
                <th style={{ padding: 12 }}>Total</th>
                <th style={{ padding: 12 }}>Remaining</th>
                <th style={{ padding: 12 }}>Zone</th>
                <th style={{ padding: 12 }}>Created</th>
                <th style={{ padding: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map(a => (
                <AllocationRow key={a.id} allocation={a} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
