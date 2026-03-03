'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, MapPin, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { getAdminProducers, updateProducerStatus } from '@/services/admin.service';
import toast from 'react-hot-toast';

const C = { forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

type ProducerStatus = 'all' | 'ACTIVE' | 'PENDING' | 'SUSPENDED';
type Producer = { id: string; businessName: string; zone: string; email: string; phone: string; status: Exclude<ProducerStatus, 'all'>; productsCount: number; totalOrders: number; registrationDate: string; };

function GlassCard({ children, style, hover = true }: any) {
  return (
    <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, transition: 'box-shadow 0.3s, transform 0.2s', ...style }}
      onMouseEnter={hover ? (e: any) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(6,78,59,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; } : undefined}
      onMouseLeave={hover ? (e: any) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; } : undefined}>
      {children}
    </div>
  );
}

export default function ProducersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProducerStatus>('all');
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProducers(); }, []);

  async function loadProducers() {
    setLoading(true);
    const result = await getAdminProducers();
    if (result.success && 'data' in result && result.data) setProducers(result.data as Producer[]);
    setLoading(false);
  }

  async function handleStatusChange(producerId: string, newStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED') {
    const result = await updateProducerStatus(producerId, newStatus);
    if (result.success) { toast.success('Statut mis à jour'); loadProducers(); }
    else toast.error(result.error || 'Erreur');
  }

  const filtered = useMemo(() => producers.filter(p => {
    const matchesSearch = p.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || p.zone.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [producers, searchTerm, statusFilter]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={32} color={C.forest} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const filterButtons: { key: ProducerStatus; label: string; color: string }[] = [
    { key: 'all', label: `Tous (${producers.length})`, color: C.forest },
    { key: 'ACTIVE', label: 'Actifs', color: C.emerald },
    { key: 'PENDING', label: 'Attente', color: C.amber },
    { key: 'SUSPENDED', label: 'Suspendus', color: '#EF4444' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.sand, paddingBottom: 80 }}>
      {/* Header */}
      <header style={{ background: C.glass, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}`, padding: '24px', position: 'sticky', top: 64, zIndex: 30 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} color="white" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: C.forest, fontFamily: F.heading }}>
              Producteurs <span style={{ color: C.emerald, fontWeight: 500 }}>&amp; Partenaires</span>
            </h1>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
              <Search size={16} color={C.muted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Rechercher par nom, zone ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '14px 20px 14px 44px', borderRadius: 100, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: F.body, outline: 'none' }} />
            </div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 6, background: 'rgba(6,78,59,0.04)', borderRadius: 100, padding: 4 }}>
              {filterButtons.map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  style={{ padding: '8px 20px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: F.body, transition: 'all 0.2s', whiteSpace: 'nowrap',
                    background: statusFilter === f.key ? f.color : 'transparent', color: statusFilter === f.key ? 'white' : C.muted, boxShadow: statusFilter === f.key ? `0 4px 12px ${f.color}33` : 'none' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 20 }}>
          {filtered.length} Résultat{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 20 }}>
          {filtered.map(producer => (
            <GlassCard key={producer.id} style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(6,78,59,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: C.forest, fontFamily: F.heading }}>
                  {producer.businessName.charAt(0)}
                </div>
                <StatusBadge status={producer.status} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.forest, fontFamily: F.heading, marginBottom: 4 }}>{producer.businessName}</h3>
                <p style={{ fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {producer.zone}</p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{producer.email}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', gap: 28 }}>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: C.forest, fontFamily: F.heading }}>{producer.productsCount}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Produits</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: C.forest, fontFamily: F.heading }}>{producer.totalOrders}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ventes</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {producer.status === 'PENDING' && (
                    <button onClick={() => handleStatusChange(producer.id, 'ACTIVE')}
                      style={{ padding: '8px 16px', borderRadius: 100, border: 'none', background: 'rgba(16,185,129,0.1)', color: C.emerald, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F.body }}>Valider</button>
                  )}
                  {producer.status === 'ACTIVE' && (
                    <button onClick={() => handleStatusChange(producer.id, 'SUSPENDED')}
                      style={{ padding: '8px 16px', borderRadius: 100, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F.body }}>Suspendre</button>
                  )}
                  {producer.status === 'SUSPENDED' && (
                    <button onClick={() => handleStatusChange(producer.id, 'ACTIVE')}
                      style={{ padding: '8px 16px', borderRadius: 100, border: 'none', background: 'rgba(16,185,129,0.1)', color: C.emerald, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F.body }}>Réactiver</button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, background: C.glass, borderRadius: 24, border: `2px dashed ${C.border}` }}>
            <Search size={40} color={C.border} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 600, color: C.muted }}>Aucun producteur ne correspond à vos critères.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; fg: string; icon: React.ReactNode; label: string }> = {
    ACTIVE: { bg: 'rgba(16,185,129,0.1)', fg: C.emerald, icon: <CheckCircle size={12} />, label: 'Actif' },
    PENDING: { bg: 'rgba(217,119,6,0.1)', fg: C.amber, icon: <Clock size={12} />, label: 'En attente' },
    SUSPENDED: { bg: 'rgba(239,68,68,0.1)', fg: '#EF4444', icon: <AlertCircle size={12} />, label: 'Suspendu' },
  };
  const { bg, fg, icon, label } = cfg[status] || cfg.PENDING;
  return (
    <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 14px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 6, fontFamily: F.body }}>
      {icon} {label}
    </span>
  );
}
