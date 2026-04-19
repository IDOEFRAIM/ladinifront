import { db, schema } from '@/src/db';
import { desc } from 'drizzle-orm';

export default async function AgentHistoryPage() {
  const distributions = await db.select().from(schema.seedDistributions).orderBy(desc(schema.seedDistributions.createdAt)).limit(50);

  return (
    <div>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', color: '#064E3B', marginBottom: 16 }}>
        Historique des distributions
      </h1>

      {distributions.length === 0 ? (
        <p style={{ color: '#64748B' }}>Aucune distribution enregistrée.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>ID</th>
                <th style={{ padding: '8px 12px' }}>Producteur</th>
                <th style={{ padding: '8px 12px' }}>Quantité</th>
                <th style={{ padding: '8px 12px' }}>Statut</th>
                <th style={{ padding: '8px 12px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{d.id.slice(0, 8)}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{d.producerId.slice(0, 8)}</td>
                  <td style={{ padding: '8px 12px' }}>{d.quantity}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600,
                      background: d.status === 'VERIFIED' ? '#D1FAE5' : d.status === 'PENDING' ? '#FEF3C7' : '#FEE2E2',
                      color: d.status === 'VERIFIED' ? '#065F46' : d.status === 'PENDING' ? '#92400E' : '#991B1B',
                    }}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#64748B' }}>
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
