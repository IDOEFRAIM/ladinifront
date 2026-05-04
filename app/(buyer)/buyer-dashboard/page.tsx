'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package, Truck, Clock, CheckCircle2, XCircle, Gavel, TrendingUp,
  MapPin, Phone, User, ShieldCheck, Loader2, RefreshCw, Eye,
  ChevronRight, AlertTriangle, FileText,
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { useAccountType, B2BOnly } from '@/components/guards/AccountTypeGuard';

const C = { forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#DC2626', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

// Uses shared StatusBadge from components/ui/StatusBadge.tsx

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, count }: { icon: any; title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={C.forest} />
      </div>
      <h2 style={{ fontFamily: F.heading, fontSize: '1.15rem', fontWeight: 800, color: C.forest, margin: 0 }}>{title}</h2>
      {count !== undefined && (
        <span style={{ background: 'rgba(16,185,129,0.08)', color: C.emerald, padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{count}</span>
      )}
    </div>
  );
}

export default function BuyerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/buyer/dashboard');
      if (!res.ok) throw new Error('Erreur de chargement');
      setData(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <Loader2 size={32} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
      <p style={{ fontFamily: F.body, color: C.muted, fontSize: 14 }}>Chargement du tableau de bord...</p>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <AlertTriangle size={40} color={C.red} style={{ marginBottom: 12 }} />
      <p style={{ fontFamily: F.body, color: C.red }}>{error}</p>
      <button onClick={fetchDashboard} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 100, border: 'none', background: C.forest, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Réessayer</button>
    </div>
  );

  const { profile, activeOrders = [], orderHistory = [], auctions, suggestedProducts = [] } = data || {};

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '8px 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: F.heading, fontSize: '1.6rem', fontWeight: 800, color: C.forest, margin: 0, letterSpacing: '-0.02em' }}>
            Tableau de bord
          </h1>
          {profile && (
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
              {profile.establishmentName || profile.user?.name || 'Acheteur'}
              {profile.buyerType && <span style={{ marginLeft: 8, color: C.amber, fontWeight: 700 }}>· {profile.buyerType.name}</span>}
              {profile.trustBadge && (
                <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, color: C.emerald, fontWeight: 700 }}>
                  <ShieldCheck size={14} /> Vérifié
                </span>
              )}
            </p>
          )}
        </div>
        <button onClick={fetchDashboard} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 100, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.muted }}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Commandes actives', value: activeOrders.length, icon: Package, color: C.amber },
          { label: 'Total commandes', value: orderHistory.length, icon: TrendingUp, color: C.emerald },
          { label: 'Enchères gagnées', value: auctions?.won?.length || 0, icon: Gavel, color: C.forest },
          { label: 'Enchères en cours', value: auctions?.active?.length || 0, icon: Clock, color: '#7C3AED' },
        ].map((s, i) => (
          <Card key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontFamily: F.heading, fontSize: '1.4rem', fontWeight: 800, color: C.forest }}>{s.value}</div>
              <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, fontWeight: 600 }}>{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <B2BOnly>
        <div style={{ marginBottom: 28 }}>
          <SectionTitle icon={FileText} title="Espace professionnel" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { title: 'Commandes groupées', desc: 'Préparez des paniers volumineux pour vos besoins de service.', icon: Package },
              { title: 'Factures pro', desc: 'Centralisez vos commandes et justificatifs d’achat.', icon: FileText },
              { title: 'Récurrence', desc: 'Anticipez vos réapprovisionnements hebdomadaires.', icon: RefreshCw },
            ].map((item) => (
              <Card key={item.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(217,119,6,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={18} color={C.amber} />
                </div>
                <div>
                  <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 14, color: C.forest }}>{item.title}</div>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 3 }}>{item.desc}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </B2BOnly>

      {/* Active orders */}
      <SectionTitle icon={Package} title="Commandes actives" count={activeOrders.length} />
      {activeOrders.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40, marginBottom: 28 }}>
          <Package size={32} color={C.muted} style={{ marginBottom: 8, opacity: 0.4 }} />
          <p style={{ fontFamily: F.body, color: C.muted, margin: 0 }}>Aucune commande active</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {activeOrders.map((order: any) => (
            <Card key={order.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>
                    REF #{order.id.substring(0, 8)}
                  </div>
                  <div style={{ fontFamily: F.heading, fontSize: '1.2rem', fontWeight: 800, color: C.forest }}>
                    {Number(order.totalAmount).toLocaleString()} <span style={{ fontSize: '0.7rem', color: C.muted, fontWeight: 600 }}>CFA</span>
                  </div>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 4 }}>
                    {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <StatusBadge status={order.status} type="order" />
                  {order.delivery && <StatusBadge status={order.delivery.status} type="delivery" />}
                </div>
              </div>

              {/* Items */}
              {order.items?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  {order.items.map((item: any) => (
                    <span key={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: C.sand, fontSize: 12, fontFamily: F.body, color: C.text, fontWeight: 500, border: `1px solid ${C.border}` }}>
                      {item.product?.name || 'Produit'} × {item.quantity}
                    </span>
                  ))}
                </div>
              )}

              {/* Delivery tracking link */}
              {order.delivery && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: F.body, color: C.muted }}>
                    <Truck size={14} />
                    {order.delivery.agent?.user?.name ? (
                      <span>Livreur : <strong style={{ color: C.forest }}>{order.delivery.agent.user.name}</strong></span>
                    ) : (
                      <span>En attente d'un livreur...</span>
                    )}
                    {order.delivery.estimatedDistanceKm && (
                      <span style={{ marginLeft: 8 }}>· {order.delivery.estimatedDistanceKm} km</span>
                    )}
                  </div>
                  <Link href={`/tracking/${order.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.emerald, fontFamily: F.body, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                    <Eye size={14} /> Suivre <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Auction history */}
      {auctions && (auctions.active?.length > 0 || auctions.won?.length > 0 || auctions.lost?.length > 0) && (
        <>
          <SectionTitle icon={Gavel} title="Mes enchères" count={(auctions.active?.length || 0) + (auctions.won?.length || 0)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {[...auctions.active || [], ...auctions.won || [], ...auctions.lost || []].slice(0, 10).map((auction: any) => {
              const isWon = auctions.won?.some((w: any) => w.id === auction.id);
              const isActive = auctions.active?.some((a: any) => a.id === auction.id);
              return (
                <Card key={auction.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '0.95rem', color: C.forest }}>
                      {auction.subCategory?.name || 'Enchère'}
                    </div>
                    <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>
                      Qté: {auction.quantity} · Zone: {auction.targetZone?.name || '—'}
                    </div>
                    <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {auction.bids?.length || 0} offre{(auction.bids?.length || 0) > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div>
                    {isActive && <StatusBadge status="OPEN" type="auction" />}
                    {isWon && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 100, background: 'rgba(16,185,129,0.08)', color: C.emerald, fontSize: 11, fontWeight: 700 }}><CheckCircle2 size={12} /> Gagnée</span>}
                    {!isActive && !isWon && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 100, background: 'rgba(220,38,38,0.08)', color: C.red, fontSize: 11, fontWeight: 700 }}><XCircle size={12} /> Perdue</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Suggested products */}
      {suggestedProducts.length > 0 && (
        <>
          <SectionTitle icon={TrendingUp} title="Produits suggérés" count={suggestedProducts.length} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {suggestedProducts.slice(0, 8).map((p: any) => (
              <Card key={p.id} style={{ padding: 14 }}>
                <div style={{ width: '100%', height: 100, borderRadius: 12, overflow: 'hidden', marginBottom: 10, background: C.sand, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}` }}>
                  {p.images?.[0] ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={28} color={C.muted} style={{ opacity: 0.3 }} />}
                </div>
                <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '0.85rem', color: C.forest, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>{p.categoryLabel}</div>
                <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: '1rem', color: C.amber, marginTop: 4 }}>
                  {Number(p.price).toLocaleString()} CFA
                  <span style={{ fontSize: 10, fontWeight: 500, color: C.muted }}> / {p.unit || 'unité'}</span>
                </div>
                {p.producer?.businessName && <div style={{ fontFamily: F.body, fontSize: 11, color: C.muted, marginTop: 4 }}>{p.producer.businessName}</div>}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
