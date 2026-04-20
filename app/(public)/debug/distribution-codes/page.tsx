import React from 'react';
import { db, schema } from '@/src/db';

export default async function Page() {
  if (process.env.NODE_ENV !== 'development') {
    return <div style={{ padding: 20 }}>Debug page disponible uniquement en développement.</div>;
  }

  let rows: any[] = [];
  try {
    rows = await db.query.agentActions.findMany({
      where: (t, { eq }) => eq(t.actionType, 'SEND_VERIFICATION'),
      limit: 200,
      orderBy: (t, ops) => [ops.desc(t.createdAt)],
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[debug/distribution-codes] DB query failed', err);
    return <div style={{ padding: 20, color: 'crimson' }}>Erreur lors du chargement des actions.</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Codes de vérification (debug)</h1>
      <p>Liste des actions `SEND_VERIFICATION` récentes (dev only).</p>

      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Action ID</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Distribution ID</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Code (plain)</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Status</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e6e6e6' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const payload = r.payload || {};
              const code = payload.verificationCode || payload.code || payload.verification || null;
              const distributionId = payload.distributionId || payload.distribution || payload.targetId || null;
              return (
                <tr key={r.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{r.id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{distributionId}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2', fontFamily: 'monospace' }}>{code ?? '-'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{r.status}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f2f2f2' }}>{r.createdAt ? new Date(r.createdAt).toISOString() : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
