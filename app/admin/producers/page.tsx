'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, MapPin, CheckCircle, Clock, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { getAdminProducers, updateProducerStatus } from '@/services/admin.service';
import Link from 'next/link';
import toast from 'react-hot-toast';

const C = { 
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#EF4444',
  sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', 
  muted: '#64748B', text: '#1F2937' 
};
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

type ProducerStatus = 'all' | 'ACTIVE' | 'PENDING' | 'SUSPENDED';

// Typage strict pour éviter les NaN ou undefined
type Producer = { 
  id: string; 
  businessName: string; 
  zone: string; 
  email: string; 
  phone: string; 
  status: Exclude<ProducerStatus, 'all'>; 
  productsCount: number; 
  totalOrders: number; 
};

export default function ProducersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProducerStatus>('all');
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const res = await getAdminProducers();
    if (res.success && 'data' in res) {
      // On nettoie les données ici pour s'assurer que productsCount et totalOrders sont des nombres
      const cleanData = (res.data as any[]).map(p => ({
        ...p,
        productsCount: Number(p.productsCount) || 0,
        totalOrders: Number(p.totalOrders) || 0
      }));
      setProducers(cleanData);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => producers.filter(p => {
    const term = searchTerm.toLowerCase();
    const match = p.businessName.toLowerCase().includes(term) || p.zone.toLowerCase().includes(term) || p.email.toLowerCase().includes(term);
    return match && (statusFilter === 'all' || p.status === statusFilter);
  }), [producers, searchTerm, statusFilter]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={32} color={C.forest} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.sand, paddingBottom: 80 }}>
      <header style={{ background: C.glass, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}`, padding: '24px 20px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Users size={22} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.forest, fontFamily: F.heading }}>Producteurs</h1>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
              <Search size={16} color={C.muted} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
              <input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: 100, border: `1px solid ${C.border}`, outline: 'none', fontFamily: F.body }} />
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 100 }}>
              {(['all', 'ACTIVE', 'PENDING', 'SUSPENDED'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: '8px 16px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: '0.2s',
                    background: statusFilter === s ? C.forest : 'transparent', color: statusFilter === s ? 'white' : C.muted }}>
                  {s === 'all' ? 'Tous' : s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {filtered.map(p => (
          <div key={p.id} style={{ background: 'white', borderRadius: 24, border: `1px solid ${C.border}`, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <StatusBadge status={p.status} />
              <Link href={`/admin/producers/${p.id}`} style={{ color: C.muted }}><ChevronRight size={18} /></Link>
            </div>

            <Link href={`/admin/producers/${p.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.forest, fontFamily: F.heading, marginBottom: 4 }}>{p.businessName}</h3>
                <p style={{ fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14} /> {p.zone}</p>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <Stat label="Produits" value={p.productsCount} />
                <Stat label="Ventes" value={p.totalOrders} />
              </div>
              <ActionButton producer={p} onUpdate={loadData} />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div>
    <p style={{ fontSize: 18, fontWeight: 800, color: C.forest, margin: 0 }}>
      {value}
    </p>
    <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', margin: 0 }}>
      {label}
    </p>
  </div>
);

const ActionButton = ({ producer, onUpdate }: { producer: Producer, onUpdate: () => void }) => {
  const update = async (status: any) => {
    const res = await updateProducerStatus(producer.id, status);
    if (res.success) {
      toast.success('Mis à jour');
      onUpdate();
    } else {
      toast.error('Erreur');
    }
  };

  const btnStyle = (bg: string, co: string) => ({ padding: '8px 16px', borderRadius: 100, border: 'none', background: bg, color: co, fontSize: 11, fontWeight: 700, cursor: 'pointer' });

  if (producer.status === 'PENDING') return <button onClick={() => update('ACTIVE')} style={btnStyle('rgba(16,185,129,0.1)', C.emerald)}>Valider</button>;
  if (producer.status === 'ACTIVE') return <button onClick={() => update('SUSPENDED')} style={btnStyle('rgba(239,68,68,0.08)', C.red)}>Suspendre</button>;
  return <button onClick={() => update('ACTIVE')} style={btnStyle('rgba(16,185,129,0.1)', C.emerald)}>Réactiver</button>;
};

function StatusBadge({ status }: { status: string }) {
  const cfg: any = {
    ACTIVE: { bg: 'rgba(16,185,129,0.1)', fg: C.emerald, icon: <CheckCircle size={12} />, label: 'Actif' },
    PENDING: { bg: 'rgba(217,119,6,0.1)', fg: C.amber, icon: <Clock size={12} />, label: 'Attente' },
    SUSPENDED: { bg: 'rgba(239,68,68,0.1)', fg: C.red, icon: <AlertCircle size={12} />, label: 'Suspendu' },
  };
  const { bg, fg, icon, label } = cfg[status] || cfg.PENDING;
  return (
    <span style={{ background: bg, color: fg, fontSize: 10, fontWeight: 700, padding: '6px 12px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' }}>
      {icon} {label}
    </span>
  );
}