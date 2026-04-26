'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, UserPlus, Package, Search, Filter, Loader2, 
  XCircle, Clock, MapPin, Mail, Phone, AlertCircle 
} from 'lucide-react';
import { getAdminValidations, updateProducerStatus } from '@/services/admin.service';

const C = { 
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', 
  sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', 
  muted: '#64748B', text: '#1F2937', red: '#EF4444' 
};

const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

type TabKey = 'ALL' | 'PRODUCER' | 'PRODUCT';

export default function AdminValidationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminValidations();
      if (res.success && res.data) {
        setItems(res.data);
      } else {
        setError(res.error || "Erreur de chargement");
      }
    } catch (err) {
      setError("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async (id: string, status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      const res = await updateProducerStatus(id, status);
      if (res.success) {
        setItems(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  // Filtrage robuste (ignore la casse)
  const filtered = items.filter(item => {
    const itemType = item.type?.toUpperCase();
    const matchesTab = activeTab === 'ALL' || itemType === activeTab;
    
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      item.title?.toLowerCase().includes(searchLower) || 
      item.metadata?.phone?.includes(search) ||
      item.metadata?.email?.toLowerCase().includes(searchLower);

    return matchesTab && matchesSearch;
  });

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={40} color={C.emerald} className="animate-spin" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontFamily: F.body, fontWeight: 600, color: C.muted }}>Chargement des dossiers...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.sand, paddingBottom: 80 }}>
      
      {/* HEADER SECTION */}
      <div style={{ background: 'white', borderBottom: `1px solid ${C.border}`, padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: C.forest, fontFamily: F.heading, letterSpacing: '-0.02em' }}>
                File de <span style={{ color: C.emerald }}>Validation</span>
              </h1>
              <p style={{ color: C.muted, marginTop: 4 }}>{items.length} dossiers en attente de revue</p>
            </div>

            <div style={{ display: 'flex', gap: 8, background: '#F1F5F9', padding: 4, borderRadius: 12 }}>
              {[
                { key: 'ALL', label: 'Tous' },
                { key: 'PRODUCER', label: 'Producteurs' },
                { key: 'PRODUCT', label: 'Produits' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                    background: activeTab === tab.key ? 'white' : 'transparent',
                    color: activeTab === tab.key ? C.forest : C.muted,
                    boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input 
              placeholder="Nom, email, téléphone ou zone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '16px 16px 16px 48px', borderRadius: 16,
                border: `1px solid ${C.border}`, background: C.sand, outline: 'none', fontFamily: F.body, fontSize: 15
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '40px auto', padding: '0 24px' }}>
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', padding: 16, borderRadius: 12, display: 'flex', gap: 12, color: C.red, marginBottom: 20 }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          <AnimatePresence mode='popLayout'>
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{
                  background: 'white', borderRadius: 20, padding: 20,
                  border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 20,
                  boxShadow: '0 2px 12px rgba(6,78,59,0.02)'
                }}
              >
                {/* Visual Icon */}
                <div style={{ 
                  width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: item.type?.toUpperCase() === 'PRODUCER' ? 'rgba(16,185,129,0.08)' : 'rgba(217,119,6,0.08)',
                  color: item.type?.toUpperCase() === 'PRODUCER' ? C.emerald : C.amber
                }}>
                  {item.type?.toUpperCase() === 'PRODUCER' ? <UserPlus size={24} /> : <Package size={24} />}
                </div>

                {/* Info Block */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: C.muted }}>{item.date}</span>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.border }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: item.type?.toUpperCase() === 'PRODUCER' ? C.emerald : C.amber }}>
                      {item.type?.toUpperCase()}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: C.forest }}>{item.title}</h3>
                  
                  <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.muted }}>
                      <Mail size={12} /> {item.metadata?.email || 'N/A'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.muted }}>
                      <Phone size={12} /> {item.metadata?.phone || 'N/A'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.muted }}>
                      <MapPin size={12} /> {item.metadata?.zone || 'Zone inconnue'}
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    onClick={() => handleAction(item.id, 'SUSPENDED')}
                    style={{
                      padding: '10px 16px', borderRadius: 10, border: '1px solid #FEE2E2',
                      background: '#FFF1F1', color: C.red, fontWeight: 700, fontSize: 13,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <XCircle size={16} /> Rejeter
                  </button>
                  <button 
                    onClick={() => handleAction(item.id, 'ACTIVE')}
                    style={{
                      padding: '10px 20px', borderRadius: 10, border: 'none',
                      background: C.forest, color: 'white', fontWeight: 700, fontSize: 13,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 4px 12px rgba(6,78,59,0.15)'
                    }}
                  >
                    <CheckCircle size={16} /> Valider
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '80px 0', background: 'white', borderRadius: 24, border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🍃</div>
              <h3 style={{ fontWeight: 800, color: C.forest }}>Aucun dossier trouvé</h3>
              <p style={{ color: C.muted, fontSize: 14 }}>Essayez de modifier vos filtres ou la recherche.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}