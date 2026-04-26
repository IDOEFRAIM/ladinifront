'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, MapPin, Mail, Phone, Calendar, 
  Package, ShoppingCart, TrendingUp, ShieldCheck, Globe, Loader2, Landmark
} from 'lucide-react';
import { getAdminProducers } from '@/services/admin.service';

const C = { 
  forest: '#064E3B', 
  emerald: '#10B981', 
  amber: '#D97706', 
  sand: '#F9FBF8', 
  border: 'rgba(6,78,59,0.07)', 
  muted: '#64748B' 
};

export default function ProducerDetailPage({ params }: { params: Promise<{ producerId: string }> }) {
  const { producerId } = use(params);
  const router = useRouter();
  const [producer, setProducer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await getAdminProducers();
        if (res.success && 'data' in res) {
          // On cherche le producteur spécifique dans la liste
          const found = (res.data as any[]).find(p => p.id === producerId);
          setProducer(found);
        }
      } catch (err) {
        console.error("Erreur détaillée:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [producerId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={32} color={C.forest} className="animate-spin" />
    </div>
  );

  if (!producer) return (
    <div style={{ padding: 100, textAlign: 'center', color: C.muted }}>
      Producteur introuvable.
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.sand, paddingBottom: 60 }}>
      {/* Sticky Header */}
      <div style={{ background: 'white', borderBottom: `1px solid ${C.border}`, padding: '16px 24px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          <button 
            onClick={() => router.back()} 
            style={{ border: `1px solid ${C.border}`, background: 'white', cursor: 'pointer', color: C.forest, borderRadius: '12px', padding: '8px' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: C.forest, margin: 0 }}>Profil Partenaire</h1>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>ID: {producer.id.slice(0,8)}</p>
          </div>
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px' }}>
        
        {/* Main Card */}
        <div style={{ background: 'white', borderRadius: 32, padding: 40, border: `1px solid ${C.border}`, marginBottom: 32, boxShadow: '0 4px 24px rgba(6,78,59,0.02)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'center' }}>
            <div style={{ 
              width: 100, height: 100, borderRadius: 32, 
              background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: 40, color: 'white', fontWeight: 800 
            }}>
              {producer.businessName?.charAt(0)}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: C.forest, margin: 0 }}>{producer.businessName}</h2>
                <StatusTag status={producer.status} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <InfoItem icon={<MapPin size={16} />} text={producer.zone} />
                <InfoItem icon={<Mail size={16} />} text={producer.email} />
                <InfoItem icon={<Phone size={16} />} text={producer.phone || 'Non renseigné'} />
                <InfoItem icon={<Calendar size={16} />} text={`Inscrit le ${new Date(producer.registrationDate).toLocaleDateString()}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 40 }}>
          <StatCard icon={<Package color={C.emerald} />} label="Produits Référencés" value={producer.productsCount} />
          <StatCard icon={<Landmark color={C.forest} />} label="Exploitations (Farms)" value={producer.farmsCount} />
          <StatCard icon={<ShoppingCart color={C.amber} />} label="Ventes Cumulées" value={producer.totalOrders} />
          <StatCard icon={<TrendingUp color="#3B82F6" />} label="Zone d'influence" value={producer.zone} />
        </div>

        {/* Administration Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, border: `1px solid ${C.border}` }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.forest, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={20} /> État des Vérifications
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <CheckItem label="Validation du Compte" checked={producer.status === 'ACTIVE'} />
              <CheckItem label="Email de contact vérifié" checked={!!producer.email} />
              <CheckItem label="Zone géographique rattachée" checked={producer.zone !== 'Non assigné'} />
              <CheckItem label="Numéro de téléphone lié" checked={!!producer.phone} />
            </ul>
          </div>

          <div style={{ 
            background: C.forest, borderRadius: 24, padding: 32, color: 'white', 
            position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' 
          }}>
            <Globe style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1 }} size={150} />
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Notes Internes</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.8, marginBottom: 24 }}>
              Ce partenaire opère dans la zone de <strong>{producer.zone}</strong>. 
              Avec {producer.farmsCount} ferme(s) enregistrée(s), ce producteur est un acteur clé de l'approvisionnement local.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ background: 'white', color: C.forest, border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                Gérer le statut
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Composants utilitaires
function InfoItem({ icon, text }: { icon: any, text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 14 }}>
      <span style={{ color: C.emerald }}>{icon}</span>
      {text}
    </div>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <div style={{ background: 'white', padding: 24, borderRadius: 24, border: `1px solid ${C.border}`, transition: 'transform 0.2s' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(6,78,59,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        {icon}
      </div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: C.forest }}>{value || 0}</p>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string, checked: boolean }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, fontSize: 14 }}>
      <div style={{ 
        width: 20, height: 20, borderRadius: 6, 
        border: `2px solid ${checked ? C.emerald : '#CBD5E1'}`, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        background: checked ? C.emerald : 'transparent' 
      }}>
        {checked && <div style={{ width: 8, height: 4, borderLeft: '2px solid white', borderBottom: '2px solid white', transform: 'rotate(-45deg) translateY(-1px)' }} />}
      </div>
      <span style={{ fontWeight: 600, color: checked ? C.forest : C.muted }}>{label}</span>
    </li>
  );
}

function StatusTag({ status }: { status: string }) {
  const colors: any = {
    ACTIVE: { bg: 'rgba(16,185,129,0.1)', co: C.emerald },
    PENDING: { bg: 'rgba(217,119,6,0.1)', co: C.amber },
    SUSPENDED: { bg: 'rgba(239,68,68,0.1)', co: '#EF4444' }
  };
  const style = colors[status] || colors.PENDING;
  return (
    <span style={{ 
      padding: '6px 14px', borderRadius: 100, background: style.bg, 
      color: style.co, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' 
    }}>
      {status}
    </span>
  );
}