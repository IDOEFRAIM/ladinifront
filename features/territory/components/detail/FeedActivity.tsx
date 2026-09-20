'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaHistory } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { traceAction } from '@/features/territory/services/agri-persister';
import { C } from '@/features/territory/components/detail/territory-detail.tokens';

export function FeedActivity({ feed }: any) {
  const [filter, setFilter] = useState<'all' | 'logistique' | 'production' | 'alerts'>('all');
  const [localFeed, setLocalFeed] = useState(feed || []);

  // keep local feed in sync when parent feed updates
  useEffect(() => setLocalFeed(feed || []), [feed]);

  const handleValidate = async (evt: any) => {
    // optimistic remove
    setLocalFeed((f:any) => f.filter((x: any) => x.id !== evt.id));
    await traceAction({ territoryId: (evt.meta && evt.meta.territoryId) || 'unknown', action: 'validate_event', meta: { eventId: evt.id } });
    toast.success('Événement validé');
  };

  const handleCall = async (evt: any) => {
    await traceAction({ territoryId: (evt.meta && evt.meta.territoryId) || 'unknown', action: 'call_agent', meta: { eventId: evt.id } });
    toast('Appel en cours…');
  };

  const filtered = localFeed.filter((f: any) => {
    if (filter === 'all') return true;
    // improved inference: prefer explicit meta.type/category/tags, fallback to regex on title
    const inferCategory = (evt: any) => {
      const title = String(evt.title || '').toLowerCase();
      const metaType = String(evt.meta?.type || evt.meta?.category || evt.meta?.kind || '').toLowerCase();
      const tags = Array.isArray(evt.meta?.tags) ? evt.meta.tags.map((t: any) => String(t).toLowerCase()).join(' ') : '';
      const combined = `${title} ${metaType} ${tags} ${JSON.stringify(evt.meta || {})}`;

      if (/(alerte|anomalie|offline|hors ligne|alert|anomaly|critical)/i.test(combined)) return 'alerts';
      if (/(ma[iî]s|mais|rendement|récolte|recolte|ferme|crop|harvest|yield)/i.test(combined)) return 'production';
      if (/(commande|collecte|livraison|cmd|point de collecte|logistique|logistics|pickup|delivery|order)/i.test(combined)) return 'logistique';
      return 'other';
    };

    const cat = inferCategory(f);
    if (filter === 'alerts') return cat === 'alerts';
    if (filter === 'production') return cat === 'production';
    if (filter === 'logistique') return cat === 'logistique';
    return true;
  });

  return (
    <div className="lg:col-span-2 space-y-8">
      <div className="bg-white rounded-4xl border-2 border-stone-100 overflow-hidden">
        <div className="p-6 border-b border-stone-50 flex items-center justify-between" style={{ background: 'rgba(250,250,248,0.6)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <h3 className="font-black text-stone-900 uppercase tracking-tight flex items-center gap-3"><FaHistory className="text-green-800" /> Flux d'Actions</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setFilter('all')} style={{ padding: '6px 8px', borderRadius: 8, background: filter === 'all' ? C.emerald : 'transparent', color: filter === 'all' ? '#fff' : C.muted, fontWeight: 800 }}>Tous</button>
              <button onClick={() => setFilter('logistique')} style={{ padding: '6px 8px', borderRadius: 8, background: filter === 'logistique' ? '#F0FDF4' : 'transparent', color: C.muted, fontWeight: 800 }}>Logistique</button>
              <button onClick={() => setFilter('production')} style={{ padding: '6px 8px', borderRadius: 8, background: filter === 'production' ? '#FFF7ED' : 'transparent', color: C.muted, fontWeight: 800 }}>Production</button>
              <button onClick={() => setFilter('alerts')} style={{ padding: '6px 8px', borderRadius: 8, background: filter === 'alerts' ? '#FEF3F2' : 'transparent', color: C.muted, fontWeight: 800 }}>Alertes</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: 8, background: C.emerald, boxShadow: `0 6px 18px ${C.emerald}22` }} />
            <span style={{ fontSize: 10, fontWeight: 900, color: C.stone900, textTransform: 'uppercase' }}>Live</span>
          </div>
        </div>
        <div className="divide-y divide-stone-50">
          <AnimatePresence initial={false}>
            {filtered.map((evt: any) => (
              <motion.div 
                key={evt.id} 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                className="p-6 flex items-center justify-between hover:bg-stone-50/80 transition-all cursor-default group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 bg-white border-2 border-stone-100 rounded-xl flex items-center justify-center text-stone-400 group-hover:text-green-800 group-hover:border-green-800 transition-all">
                    <FaCalendarAlt size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-stone-800 uppercase tracking-tight">{evt.title}</div>
                    <div className="text-[10px] text-stone-400 font-bold uppercase italic">{evt.meta?.location || 'Point de collecte'} • {evt.time}</div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="text-sm font-black text-stone-900">{evt.delta}</div>
                    <div className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">{evt.meta?.status || 'Nouveau'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleValidate(evt)} style={{ padding: '6px 8px', borderRadius: 8, background: '#ECFEF0', fontWeight: 800 }} title="Valider">Valider</button>
                    <button onClick={() => handleCall(evt)} style={{ padding: '6px 8px', borderRadius: 8, background: '#FEF3C7', fontWeight: 800 }} title="Appeler">Appeler</button>
                    <button onClick={() => { traceAction({ territoryId: evt.meta?.territoryId || 'unknown', action: 'view_details', meta: { eventId: evt.id } }); toast('Ouverture détails…'); }} style={{ padding: '6px 8px', borderRadius: 8, background: '#F3F4F6', fontWeight: 800 }}>Détails</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
