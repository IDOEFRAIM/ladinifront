"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Check, Info } from 'lucide-react';
import { traceAction } from '@/services/agriPersister';

const severityColor: Record<string, string> = {
  critical: '#DC2626',
  warning: '#F59E0B',
  info: '#10B981',
};

function detectAnomalies(location: any, feed: any[]) {
  // Lightweight heuristic placeholder: derive anomalies from counts + feed
  const anomalies: any[] = [];
  const counts = location?._count || {};
  if ((counts?.orders || 0) < 5) anomalies.push({ id: 'a-orders-low', title: 'Volume commandes bas', message: `Volume commandes < 5 (${counts.orders || 0})`, level: 'warning' });
  if ((counts?.producers || 0) === 0) anomalies.push({ id: 'a-no-producers', title: 'Aucun producteur actif', message: 'Pas de producteurs enregistrés', level: 'critical' });
  // feed-derived anomaly: offline agent
  const offline = feed?.find((f: any) => /hors ligne|offline/i.test(String(f.title)));
  if (offline) anomalies.push({ id: 'a-agent-offline', title: 'Agent hors ligne', message: offline.title, level: 'warning' });
  return anomalies;
}

export default function TerritoryControlCenter({ territoryId, location, feed }: { territoryId: string; location: any; feed: any[] }) {
  const anomalies = useMemo(() => detectAnomalies(location, feed), [location, feed]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [overlays, setOverlays] = useState({ stress: false, harvest: false, agents: false });

  const handleResolve = async (a: any) => {
    // optimistic UI
    setExpanded(null);
    await traceAction({ territoryId, action: 'resolve_anomaly', meta: { anomalyId: a.id } });
  };

  const toggleOverlay = async (key: keyof typeof overlays) => {
    const next = { ...overlays, [key]: !overlays[key] };
    setOverlays(next);
    // trace overlay toggle for observability
    try {
      await traceAction({ territoryId, action: 'toggle_overlay', meta: { overlay: key, enabled: next[key] } });
    } catch (e) {
      // swallow - best-effort tracing
      console.warn('traceAction failed', e);
    }
  };

  const handleViewDetail = async (a: any) => {
    setExpanded(a.id === expanded ? null : a.id);
    await traceAction({ territoryId, action: 'view_anomaly', meta: { anomalyId: a.id } });
  };

  return (
    <div className="lg:col-span-1 space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: 18, border: '1px solid rgba(14,82,56,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ fontWeight: 900, color: '#0f5132' }}>Alertes de Zone</h3>
          <small style={{ color: '#7C7A72', fontWeight: 800 }}>IA • Exception</small>
        </div>

        {anomalies.length === 0 ? (
          <div style={{ padding: 18, borderRadius: 12, background: 'rgba(16,185,129,0.04)' }}>Aucune anomalie détectée</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {anomalies.map(a => (
              <motion.div key={a.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', padding: 12, borderRadius: 12, background: '#fff', border: `1px solid ${severityColor[a.level] || '#E5E7EB'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: severityColor[a.level] }} />
                    <div>
                      <div style={{ fontWeight: 800 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: '#6B6B66' }}>{a.message}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button aria-label={`Voir ${a.title}`} onClick={() => handleViewDetail(a)} style={{ background: 'transparent', borderRadius: 8, padding: 8, border: 'none', cursor: 'pointer' }}>
                      <Info size={14} />
                    </button>
                    <button onClick={() => handleResolve(a)} style={{ background: '#E6F4EA', borderRadius: 10, padding: '6px 10px', border: 'none', fontWeight: 800 }}>
                      <Check size={14} /> Résoudre
                    </button>
                    <button onClick={() => traceAction({ territoryId, action: 'call_agent', meta: { anomaly: a } })} style={{ background: '#FFF7ED', borderRadius: 10, padding: '6px 10px', border: 'none', fontWeight: 800 }}>
                      <Phone size={14} /> Appeler
                    </button>
                  </div>
                </div>

                {expanded === a.id && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(250,250,250,0.9)', border: '1px solid rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: 13, color: '#444', marginBottom: 6 }}>{a.details || 'Détails non disponibles pour cette anomalie.'}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => traceAction({ territoryId, action: 'create_task', meta: { anomalyId: a.id } })} style={{ padding: '6px 10px', borderRadius: 8, background: '#F0FDF4', border: 'none', fontWeight: 700 }}>Créer tâche</button>
                      <button onClick={() => traceAction({ territoryId, action: 'snooze_anomaly', meta: { anomalyId: a.id } })} style={{ padding: '6px 10px', borderRadius: 8, background: '#FEF3C7', border: 'none', fontWeight: 700 }}>Snooze</button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Placeholder: overlays selector for future Map integration */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: 16, border: '1px solid rgba(14,82,56,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontWeight: 900, color: '#0f5132' }}>Couches Carto</h4>
          <small style={{ color: '#7C7A72' }}>Préparation</small>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: '#F8FBF8', border: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer' }}>
            <input type="checkbox" checked={overlays.stress} onChange={() => toggleOverlay('stress')} /> Stress hydrique
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: '#F8FBF8', border: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer' }}>
            <input type="checkbox" checked={overlays.harvest} onChange={() => toggleOverlay('harvest')} /> Concentration récolte
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: '#F8FBF8', border: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer' }}>
            <input type="checkbox" checked={overlays.agents} onChange={() => toggleOverlay('agents')} /> Positions Agents
          </label>
        </div>
      </motion.div>
    </div>
  );
}
