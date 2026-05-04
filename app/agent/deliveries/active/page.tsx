'use client';

import React, { useEffect, useState } from 'react';
import {
  Truck, Package, MapPin, Phone, User, Loader2, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Navigation, KeyRound,
  ArrowRight, ShieldCheck,
} from 'lucide-react';

const C = { forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#DC2626', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, ...style }}>{children}</div>;
}

export default function ActiveDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/delivery/status');
      if (res.ok) {
        const all = await res.json();
        // Show ASSIGNED and IN_TRANSIT at the top
        const active = all.filter((d: any) => ['ASSIGNED', 'IN_TRANSIT'].includes(d.status));
        const recent = all.filter((d: any) => !['ASSIGNED', 'IN_TRANSIT'].includes(d.status)).slice(0, 10);
        setDeliveries([...active, ...recent]);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const doAction = async (action: string, deliveryId: string, extra?: Record<string, string>) => {
    setActionLoading(`${deliveryId}-${action}`);
    try {
      const res = await fetch(
        action === 'CONFIRM' ? '/api/delivery/confirm' : '/api/delivery/status',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            action === 'CONFIRM'
              ? { deliveryId, otpCode: extra?.otpCode }
              : { action, deliveryId, ...extra }
          ),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        fetchHistory();
        if (action === 'CONFIRM') alert('Livraison confirmée avec succès !');
        if (action === 'PICKUP') alert('Ramassage confirmé. En route !');
      } else {
        alert(data.error || 'Erreur');
      }
    } catch {
      alert('Erreur réseau');
    }
    setActionLoading(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 12 }}>
      <Loader2 size={28} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
      <p style={{ fontFamily: F.body, color: C.muted, fontSize: 13 }}>Chargement...</p>
    </div>
  );

  const activeDeliveries = deliveries.filter(d => ['ASSIGNED', 'IN_TRANSIT'].includes(d.status));
  const pastDeliveries = deliveries.filter(d => !['ASSIGNED', 'IN_TRANSIT'].includes(d.status));

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontFamily: F.heading, fontSize: '1.4rem', fontWeight: 800, color: C.forest, margin: 0 }}>Mes livraisons</h1>
        <button onClick={fetchHistory} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 100, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.muted }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Active deliveries */}
      {activeDeliveries.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: F.heading, fontSize: '0.95rem', fontWeight: 700, color: C.forest, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.emerald, animation: 'pulse 2s infinite' }} />
            En cours
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeDeliveries.map((d: any) => (
              <Card key={d.id} style={{ border: `2px solid ${C.emerald}20` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                      #{d.order?.id?.substring(0, 8) || d.orderId?.substring(0, 8)}
                    </div>
                    <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '1rem', color: C.forest }}>
                      {d.order?.customerName || 'Client'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 4 }}>
                      <MapPin size={12} /> {d.order?.city || 'Destination'}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, fontFamily: F.body,
                    background: d.status === 'ASSIGNED' ? 'rgba(37,99,235,0.08)' : 'rgba(8,145,178,0.08)',
                    color: d.status === 'ASSIGNED' ? '#2563EB' : '#0891B2',
                  }}>
                    {d.status === 'ASSIGNED' ? <><Package size={12} /> À ramasser</> : <><Truck size={12} /> En route</>}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  {d.status === 'ASSIGNED' && (
                    <button
                      onClick={() => doAction('PICKUP', d.id)}
                      disabled={actionLoading === `${d.id}-PICKUP`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '12px 20px', borderRadius: 14, border: 'none',
                        background: '#2563EB', color: '#fff', cursor: 'pointer',
                        fontFamily: F.body, fontSize: 14, fontWeight: 700, width: '100%',
                        opacity: actionLoading === `${d.id}-PICKUP` ? 0.6 : 1,
                      }}
                    >
                      {actionLoading === `${d.id}-PICKUP` ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Package size={16} /> Confirmer le ramassage</>}
                    </button>
                  )}

                  {d.status === 'IN_TRANSIT' && (
                    <>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <KeyRound size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, opacity: 0.5 }} />
                          <input
                            type="text"
                            placeholder="Code OTP du client"
                            maxLength={6}
                            value={otpInputs[d.id] || ''}
                            onChange={(e) => setOtpInputs({ ...otpInputs, [d.id]: e.target.value.replace(/\D/g, '') })}
                            style={{
                              width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
                              borderRadius: 14, border: `1px solid ${C.border}`, background: '#fff',
                              fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: C.forest,
                              textAlign: 'center', letterSpacing: 6, boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => doAction('CONFIRM', d.id, { otpCode: otpInputs[d.id] || '' })}
                          disabled={actionLoading === `${d.id}-CONFIRM` || (otpInputs[d.id]?.length || 0) < 6}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '12px 20px', borderRadius: 14, border: 'none',
                            background: C.emerald, color: '#fff', cursor: 'pointer',
                            fontFamily: F.body, fontSize: 14, fontWeight: 700,
                            opacity: actionLoading === `${d.id}-CONFIRM` || (otpInputs[d.id]?.length || 0) < 6 ? 0.5 : 1,
                          }}
                        >
                          {actionLoading === `${d.id}-CONFIRM` ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><ShieldCheck size={16} /> Confirmer livraison</>}
                        </button>
                        <button
                          onClick={() => { if (confirm('Signaler un échec de livraison ?')) doAction('FAILED', d.id); }}
                          disabled={actionLoading === `${d.id}-FAILED`}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '12px 16px', borderRadius: 14, border: `1px solid ${C.red}30`,
                            background: `${C.red}08`, color: C.red, cursor: 'pointer',
                            fontFamily: F.body, fontSize: 13, fontWeight: 700,
                          }}
                        >
                          <XCircle size={14} /> Échec
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past deliveries */}
      {pastDeliveries.length > 0 && (
        <div>
          <h2 style={{ fontFamily: F.heading, fontSize: '0.95rem', fontWeight: 700, color: C.muted, marginBottom: 12 }}>Historique récent</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastDeliveries.map((d: any) => (
              <Card key={d.id} style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.forest }}>
                    {d.order?.customerName || 'Client'} · {d.order?.city || '—'}
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted }}>
                    {Number(d.order?.totalAmount || 0).toLocaleString()} CFA
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, fontFamily: F.body,
                  background: d.status === 'DELIVERED' ? 'rgba(16,185,129,0.08)' : 'rgba(220,38,38,0.08)',
                  color: d.status === 'DELIVERED' ? C.emerald : C.red,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  {d.status === 'DELIVERED' ? <><CheckCircle2 size={10} /> Livré</> : <><XCircle size={10} /> Échoué</>}
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {deliveries.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <Truck size={36} color={C.muted} style={{ marginBottom: 10, opacity: 0.4 }} />
          <p style={{ fontFamily: F.body, color: C.muted, margin: 0 }}>Aucune livraison pour le moment</p>
        </Card>
      )}
    </div>
  );
}
