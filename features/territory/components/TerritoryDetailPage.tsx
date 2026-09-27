'use client';

import { useState, useEffect, use, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import TerritoryControlCenter from '@/features/territory/components/TerritoryControlCenter';
import { traceAction } from '@/features/territory/services/agri-persister';
import { C, F } from '@/features/territory/components/detail/territory-detail.tokens';
import { useTerritoryDetail } from '@/features/territory/components/detail/useTerritoryDetail';
import { LoadingScreen, NotFoundScreen } from '@/features/territory/components/detail/DetailScreens';
import { HeaderActions } from '@/features/territory/components/detail/HeaderActions';
import { ZoneIdentity } from '@/features/territory/components/detail/ZoneIdentity';
import { KpiDashboard } from '@/features/territory/components/detail/KpiDashboard';
import { FeedActivity } from '@/features/territory/components/detail/FeedActivity';
import { ZoneSupervisor } from '@/features/territory/components/detail/ZoneSupervisor';

export default function TerritoryDetailPage({ params }: { params: Promise<{ territoryId: string }> }) {
  const resolvedParams = use(params);
  const territoryId = resolvedParams.territoryId;
  const router = useRouter();

  // UI state for dynamic header
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [compactHeader, setCompactHeader] = useState(false);

  const {
    loading,
    isEditing,
    setIsEditing,
    zone,
    regions,
    feed,
    displayCounts,
    form,
    setForm,
    handleUpdate,
  } = useTerritoryDetail(territoryId);

  const hasLive = useMemo(() => Array.isArray(feed) && feed.length > 0, [feed]);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      setCompactHeader(y > 120);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) return <LoadingScreen />;
  if (!zone) return <NotFoundScreen router={router} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen pb-20 px-4 md:px-12 pt-8" style={{ background: C.sand }}>

      {/* Page header (shrinks on scroll) */}
      <motion.div
        ref={headerRef}
        initial={false}
        animate={{ padding: compactHeader ? '10px 24px' : '20px 24px' }}
        transition={{ duration: 0.22 }}
        style={{ background: C.glass, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}`, position: 'relative', zIndex: 10 }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(16,150,90,0.08)' }}>
              <FaMapMarkerAlt size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: compactHeader ? 16 : 24, fontWeight: 800, color: C.forest, fontFamily: F.heading, margin: 0 }}>{zone.name}</h1>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{zone.climaticRegion?.name || '—'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasLive && (
                <motion.span animate={{ scale: [1, 1.45, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 10, height: 10, borderRadius: 10, background: C.emerald, boxShadow: `0 0 14px ${C.emerald}33` }} />
              )}
              <div style={{ fontSize: 12, color: C.muted, fontFamily: F.body }}>{hasLive ? 'Activité récente' : 'Aucune activité'}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sticky actions (animated into view)
          Ensure they sit below Admin top header (64px) + desktop nav (~64px) to avoid overlap. */}
      <div style={{ position: 'sticky', top: 132, zIndex: 18 }}>
        <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.28 }} style={{ padding: '10px 24px', background: C.glass, backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.border}` }}>
          <HeaderActions
            router={router}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            handleUpdate={handleUpdate}
          />
        </motion.div>
      </div>
      <ZoneIdentity
        zone={zone}
        isEditing={isEditing}
        form={form}
        setForm={setForm}
      />
      <KpiDashboard displayCounts={displayCounts} onOpenDiagnostic={() => { setDiagnosticOpen(true); }} />
      <AnimatePresence>
        {diagnosticOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} onClick={() => setDiagnosticOpen(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.18 }} style={{ background: '#fff', borderRadius: 16, padding: 20, width: 720, maxWidth: '94%', zIndex: 90 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontWeight: 900 }}>Diagnostic — Score Potentiel</h3>
                <button onClick={() => setDiagnosticOpen(false)} style={{ background: 'transparent', border: 'none', fontWeight: 900 }}>Fermer</button>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <p style={{ color: C.muted }}>Ce diagnostic identifie les principaux freins potentiels à la performance de la zone.</p>
                <ul style={{ marginLeft: 12 }}>
                  <li>• Données sol insuffisantes (capteurs manquants)</li>
                  <li>• Agents terrain sous-équipés</li>
                  <li>• Couverture réseau instable</li>
                </ul>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button style={{ padding: '8px 12px', background: C.emerald, color: '#fff', borderRadius: 8, fontWeight: 900 }} onClick={() => { traceAction({ territoryId, action: 'diagnostic_ack', meta: {} }); setDiagnosticOpen(false); toast.success('Diagnostic tracé'); }}>Accepter plan d'action</button>
                  <button style={{ padding: '8px 12px', background: '#F3F4F6', borderRadius: 8, fontWeight: 800 }} onClick={() => setDiagnosticOpen(false)}>Annuler</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid lg:grid-cols-3 gap-10">
        <TerritoryControlCenter territoryId={territoryId} location={zone} feed={feed} />
        <FeedActivity feed={feed} />
        <ZoneSupervisor />
      </div>
    </motion.div>
  );
}

// Custom hooks and components extracted below
