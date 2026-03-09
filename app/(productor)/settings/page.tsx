import React from 'react';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { requireProducer } from '@/lib/api-guard';
import ProducerSettingsForm from '@/components/ProducerSettingsForm';
import ZoneSelector from '@/components/ZoneSelector';
import { Settings } from 'lucide-react';

export const dynamic = 'force-dynamic';

const C = { forest:'#064E3B', emerald:'#10B981', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

function renderRestrictedAccess() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, padding: '40px 32px', textAlign: 'center' as const }}>
        <h2 style={{ fontFamily: F.heading, fontWeight: 800, color: C.forest }}>Acces restreint</h2>
        <p style={{ fontFamily: F.body, fontSize: '0.85rem', color: C.muted, marginTop: 8 }}>Veuillez vous connecter en tant que producteur pour acceder aux parametres.</p>
      </div>
    </div>
  );
}

function renderProducerNotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <p style={{ fontFamily: F.body, color: C.muted }}>Profil producteur introuvable.</p>
    </div>
  );
}

function getInitialData(producer: any) {
  return {
    name: producer.businessName || producer.user?.name || '',
    email: producer.user?.email || '',
    phone: producer.user?.phone || '',
    location: [producer.region, producer.province, producer.commune].filter(Boolean).join(', ') || ''
  };
}

export default async function SettingsPage() {
  const { user, error } = await requireProducer();
  if (error || !user) return renderRestrictedAccess();

  const producerId = (user.producerId as string) || user.id;
  const producer = await db.query.producers.findFirst({
    where: eq(schema.producers.id, producerId),
    columns: { id: true, businessName: true, region: true, province: true, commune: true },
    with: { user: { columns: { id: true, name: true, email: true, phone: true } } },
  });

  // current user's zone
  const me = await db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { zoneId: true } });

  // load active zones for selection
  const zones = await db.query.zones.findMany({ columns: { id: true, name: true } });

  // bind server action to update user zone (optional)
  let serverUpdateZone = undefined;
  try {
    const orgMod = await import('@/app/actions/org.server');
    const updateUserZoneAction = orgMod.updateUserZoneAction;
    serverUpdateZone = async (zoneId: string) => {
      try {
        const r = await updateUserZoneAction(user.id, zoneId);
        return r;
      } catch (err) {
        return { success: false, error: String(err) };
      }
    };
  } catch (e) {
    // ignore - fallback to client API
  }

  if (!producer) return renderProducerNotFound();
  const initialData = getInitialData(producer);

  return (
    <div style={{ minHeight: '100vh', background: C.sand, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(249,251,248,0.85)', backdropFilter: 'blur(20px)', padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontFamily: F.heading, fontSize: '1.5rem', fontWeight: 900, color: C.forest, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Settings size={22} color={C.emerald} /> Parametres
        </h1>
        <p style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted }}>Gerez votre profil et les preferences de l application</p>
      </div>

      <div style={{ padding: 24 }}>
        <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, padding: 28 }}>
          <h2 style={{ fontFamily: F.heading, fontSize: '1.15rem', fontWeight: 800, color: C.text, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>Informations du Compte</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
            <div>
              <ProducerSettingsForm initialData={initialData} producerId={producer.id} />
            </div>
            <div>
                  <div style={{ background: 'white', padding: 16, borderRadius: 12 }}>
                  <ZoneSelector zones={zones} currentZoneId={me?.zoneId || null} />
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
