import { db, schema } from '@/src/db';

export default async function Page() {
  let rows: any[] = [];
  let dbError: any = null;
  try {
    // Load distributions with related allocation, producer and agent info
    const rowsWith = await db.query.seedDistributions.findMany({
      limit: 200,
      orderBy: (t, ops) => [ops.desc(t.createdAt)],
      with: {
        allocation: {
          columns: { id: true, seedType: true, remainingQuantity: true },
        },
        producer: {
          columns: { id: true, businessName: true },
          with: {
            user: { columns: { id: true, name: true, email: true } },
          },
        },
        agent: {
          columns: { id: true, name: true, email: true },
        },
      },
    });

    rows = rowsWith as any[];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[org/distributions] DB query failed:', err);
    dbError = err;
    rows = [];
  }

  const data = (rows || []).map((r: any) => ({
    id: r.id,
    allocation: r.allocation ? (r.allocation.seedType || r.allocation.id) : r.allocationId,
    producer: r.producer ? (r.producer.businessName || r.producer.user?.name || r.producer.id) : r.producerId,
    agent: r.agent ? (r.agent.name || r.agent.email || r.agent.id) : r.agentId,
    organizationId: r.organizationId,
    zoneId: r.zoneId,
    quantity: r.quantity,
    status: r.status,
    attemptsCount: r.attemptsCount,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    receiptAt: r.receiptAt ? new Date(r.receiptAt).toISOString() : null,
  }));

  return (
    <div style={{ padding: 20 }}>
      <h1>Distributions — Monitoring</h1>
      <p>Latest seed distributions (most recent first). Use this view to monitor handovers and failures.</p>

      {dbError ? (
        <div style={{ color: 'crimson', marginBottom: 12 }}>
          Error loading distributions: {(dbError && dbError.message) || 'unknown error'}. Check server logs.
        </div>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>ID</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Allocation</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Producer</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Agent</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Qty</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Status</th>
              <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Attempts</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Created</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2', fontSize: 13 }}>{d.id}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{d.allocation}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{d.producer}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{d.agent}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'right' }}>{d.quantity}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{d.status}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2', textAlign: 'center' }}>{d.attemptsCount ?? 0}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{d.createdAt ?? '-'}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{d.receiptAt ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
