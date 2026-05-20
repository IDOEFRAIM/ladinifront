'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package, Truck, Clock, CheckCircle2, XCircle, Gavel, TrendingUp,
  MapPin, Phone, User, ShieldCheck, Loader2, RefreshCw, Eye,
  ChevronRight, AlertTriangle, FileText, ShoppingCart, MessageSquare
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { useAccountType, B2BOnly } from '@/components/guards/AccountTypeGuard';

// Configuration Design
const C = { 
  forest: '#064E3B', 
  emerald: '#10B981', 
  amber: '#D97706', 
  red: '#DC2626', 
  sand: '#F9FBF8', 
  glass: 'rgba(255,255,255,0.85)', 
  border: 'rgba(6,78,59,0.08)', 
  muted: '#64748B', 
  text: '#1F2937' 
};

const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

// --- Sous-composants utilitaires ---

function Card({ children, style, hoverable = false }: { children: React.ReactNode; style?: React.CSSProperties; hoverable?: boolean }) {
  return (
    <div style={{ 
      background: C.glass, 
      backdropFilter: 'blur(16px)', 
      borderRadius: 16, 
      border: `1px solid ${C.border}`, 
      padding: 20,
      transition: 'all 0.2s ease',
      cursor: hoverable ? 'pointer' : 'default',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      ...style 
    }}>
      {children}
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick, variant = 'primary' }: any) {
  const isPrimary = variant === 'primary';
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12,
        border: isPrimary ? 'none' : `1px solid ${C.border}`,
        background: isPrimary ? C.forest : '#fff',
        color: isPrimary ? '#fff' : C.forest,
        fontFamily: F.body, fontSize: 12, fontWeight: 700, cursor: 'pointer'
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

export default function BuyerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/buyer/dashboard');
      if (!res.ok) throw new Error('Erreur de connexion aux données');
      setData(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
      <Loader2 size={40} style={{ color: C.emerald, animation: 'spin 1.5s linear infinite' }} />
      <p style={{ fontFamily: F.body, color: C.muted, fontWeight: 500 }}>Préparation de votre espace...</p>
    </div>
  );

  const { profile, activeOrders = [], orderHistory = [], auctions, suggestedProducts = [] } = data || {};

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 80px' }}>
      
      {/* Header avec Actions Rapides */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, gap: 20 }}>
        <div>
          <h1 style={{ fontFamily: F.heading, fontSize: '2rem', fontWeight: 900, color: C.forest, margin: 0 }}>
            Bonjour, {profile?.user?.name?.split(' ')[0] || 'Acheteur'} 👋
          </h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
            {profile?.establishmentName || 'Gérez vos approvisionnements et enchères.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <ActionButton label="Nouvelle commande" icon={ShoppingCart} onClick={() => router.push('/catalogue')} />
          <button onClick={fetchDashboard} style={{ padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer' }}>
            <RefreshCw size={18} color={C.muted} />
          </button>
        </div>
      </header>

      {/* Stats Clés : Focus sur l'Urgence */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 40 }}>
        <Card style={{ borderLeft: `4px solid ${C.amber}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>En cours de route</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.forest, marginTop: 4 }}>{activeOrders.filter((o: any) => o.delivery?.status === 'IN_TRANSIT').length}</div>
            </div>
            <Truck size={24} color={C.amber} />
          </div>
        </Card>
        <Card style={{ borderLeft: `4px solid ${C.emerald}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Enchères à suivre</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.forest, marginTop: 4 }}>{auctions?.active?.length || 0}</div>
            </div>
            <Gavel size={24} color={C.emerald} />
          </div>
        </Card>
        <Card style={{ borderLeft: `4px solid #7C3AED` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Total Dépenses (Mois)</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: C.forest, marginTop: 4 }}>
                {activeOrders.reduce((acc: number, curr: any) => acc + Number(curr.totalAmount), 0).toLocaleString()} <span style={{ fontSize: 12 }}>CFA</span>
              </div>
            </div>
            <TrendingUp size={24} color="#7C3AED" />
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>
        
        {/* Colonne Principale : Flux de travail */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 800, color: C.forest }}>Commandes prioritaires</h2>
            <Link href="/orders" style={{ fontSize: 13, fontWeight: 700, color: C.emerald, textDecoration: 'none' }}>Voir tout →</Link>
          </div>

          {activeOrders.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px 20px', background: 'transparent', borderStyle: 'dashed' }}>
              <Package size={40} color={C.muted} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ color: C.muted, fontWeight: 500 }}>Vous n'avez aucune commande en cours.</p>
              <Link href="/catalogue" style={{ color: C.emerald, fontWeight: 700, fontSize: 14 }}>Parcourir le catalogue</Link>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeOrders.map((order: any) => (
                <Card key={order.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <StatusBadge status={order.status} type="order" />
                        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>#{order.id.slice(-6).toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.forest }}>
                        {Number(order.totalAmount).toLocaleString()} CFA
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                        {order.items?.length} produit(s) • Commandé le {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <ActionButton label="Suivre" icon={Eye} onClick={() => router.push(`/tracking/${order.id}`)} variant="outline" />
                      {order.status === 'DELIVERED' && (
                        <ActionButton label="Confirmer" icon={CheckCircle2} onClick={() => {/* API call */}} />
                      )}
                    </div>
                  </div>
                  
                  {/* Petit stepper de livraison si en cours */}
                  {order.delivery && (
                    <div style={{ marginTop: 16, padding: '12px', background: C.sand, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <Truck size={16} color={C.emerald} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.forest }}>{order.delivery.status === 'IN_TRANSIT' ? 'En cours de livraison' : 'Prise en charge'}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>Livreur : {order.delivery.agent?.user?.name || 'Recherche...'}</div>
                      </div>
                      <Link href={`tel:${order.delivery.agent?.user?.phone}`} style={{ padding: 8, color: C.forest }}><Phone size={16} /></Link>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Enchères Section */}
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 800, color: C.forest, marginBottom: 16 }}>Vos Enchères Actives</h2>
            {auctions?.active?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {auctions.active.map((auc: any) => (
                  <Card key={auc.id} style={{ borderBottom: `3px solid ${C.emerald}` }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.forest }}>{auc.subCategory?.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Quantité: {auc.quantity}</div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: C.emerald, padding: '2px 8px', borderRadius: 6 }}>
                         {auc.bids?.length || 0} offres
                       </span>
                       <Link href={`/auctions/${auc.id}`} style={{ fontSize: 12, fontWeight: 700, color: C.forest }}>Gérer →</Link>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: C.muted }}>Aucune enchère en cours. <Link href="/auctions/new" style={{ color: C.forest, fontWeight: 600 }}>Lancer un appel d'offre ?</Link></p>
            )}
          </div>
        </section>

        {/* Colonne Latérale : Services & Suggestions */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <B2BOnly>
            <div>
              <h3 style={{ fontFamily: F.heading, fontSize: '1rem', fontWeight: 800, color: C.forest, marginBottom: 12 }}>Services Pro</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { title: 'Mes Factures', icon: FileText, path: '/billing' },
                  { title: 'Commandes Groupées', icon: Package, path: '/bulk' },
                  { title: 'Support Prioritaire', icon: MessageSquare, path: '/support' },
                ].map((s) => (
                  <div 
                    key={s.title}
                    onClick={() => router.push(s.path)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', 
                      background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`,
                      cursor: 'pointer', transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    <s.icon size={18} color={C.amber} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.forest }}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </B2BOnly>

          <div>
            <h3 style={{ fontFamily: F.heading, fontSize: '1rem', fontWeight: 800, color: C.forest, marginBottom: 12 }}>Suggestions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {suggestedProducts.slice(0, 3).map((p: any) => (
                <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 50, height: 50, borderRadius: 8, background: C.sand, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={p.images?.[0] || '/api/placeholder/50/50'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.forest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>{Number(p.price).toLocaleString()} CFA</div>
                  </div>
                  <button style={{ padding: 6, borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.1)', color: C.emerald, cursor: 'pointer' }}>
                    <Link href={`/publicProducts/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.emerald, fontSize: 12, fontWeight: 700 }}>
                    <ShoppingCart size={14} />
                    </Link>
                  </button>
                </div>
              ))}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}