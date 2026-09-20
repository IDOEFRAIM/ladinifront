"use client";

import React, { useEffect, useState } from 'react';

type TopProducer = { id: string; business_name: string; gmv: number; orders_count: number };
type RecentOrder = { id: string; customerName: string; customerPhone: string; totalAmount: number; createdAt: string; status: string };

export default function LocationDetailModal({ locationId, onClose }: { locationId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/locations/${locationId}/stats`).then(async res => {
      const j = await res.json();
      if (!active) return;
      if (!j.success) {
        setError(j.error || 'Erreur');
      } else {
        setData(j.data);
      }
    }).catch(err => {
      if (!active) return;
      setError(String(err));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [locationId]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ width: '90%', maxWidth: 900, maxHeight: '90vh', overflow: 'auto', background: 'white', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Détails - localité</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        {loading && <div>Chargement…</div>}
        {error && <div style={{ color: 'red' }}>{error}</div>}
        {!loading && !error && data && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 8, background: '#f7faf8' }}>
              <h4>GMV (Revenu)</h4>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{Number(data.gmv).toLocaleString()}</div>
              <p style={{ marginTop: 8, color: '#6b7280' }}>{data.ordersCount} commandes — {data.producersCount} producteurs — {data.farmsCount} exploitations</p>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: '#f7faf8' }}>
              <h4>Top producteurs (GMV)</h4>
              {data.topProducers && data.topProducers.length > 0 ? (
                <ol style={{ margin: 0, paddingLeft: 16 }}>
                  {data.topProducers.map((p: TopProducer) => (
                    <li key={p.id} style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>{p.business_name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{Number(p.gmv).toLocaleString()} — {p.orders_count} cmd</div>
                    </li>
                  ))}
                </ol>
              ) : <div>Aucun producteur</div>}
            </div>

            <div style={{ gridColumn: '1 / -1', padding: 12, borderRadius: 8, background: '#fff', border: '1px solid #eef2e7' }}>
              <h4>Commandes récentes</h4>
              {data.recentOrders && data.recentOrders.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #eef2e7' }}>
                      <th style={{ padding: '8px 6px' }}>Date</th>
                      <th style={{ padding: '8px 6px' }}>Client</th>
                      <th style={{ padding: '8px 6px' }}>Montant</th>
                      <th style={{ padding: '8px 6px' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o: RecentOrder) => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f4' }}>
                        <td style={{ padding: '8px 6px' }}>{new Date(o.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '8px 6px' }}>{o.customerName} • {o.customerPhone}</td>
                        <td style={{ padding: '8px 6px' }}>{Number(o.totalAmount).toLocaleString()}</td>
                        <td style={{ padding: '8px 6px' }}>{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div>Aucune commande récente</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
