import React from 'react';
import AdminSettingsClient from '@/app/admin/AdminSettingsClient';

export default async function AdminSettingsPage() {
  // Server-side: get current admin user and pass as initialProfile
  let userId: string | undefined = undefined;
  try {
    const sessionMod = await import('@/lib/session');
    const session = await sessionMod.getSessionFromRequest({} as any).catch(() => null);
    userId = session?.userId;
  } catch (e) {
    // ignore
  }

  let initialProfile = { id: undefined, name: '', role: '', theme: 'light' };
  try {
    if (userId) {
      const mod = await import('@/app/actions/admin.server');
      const user = await mod.getAdminUser(String(userId));
      if (user) initialProfile = { id: user.id, name: user.name || '', role: user.role || '', theme: 'light' };
    }
  } catch (e) {
    // ignore - client will fallback
  }

  // bind server action for role update
  let serverUpdateRole = undefined;
  try {
    const mod = await import('@/app/actions/admin.server');
    const updateUserRole = mod.updateUserRole;
    serverUpdateRole = async (role: string, targetUserId?: string) => {
      try {
        const id = targetUserId || String(userId);
        const res = await updateUserRole(id, role);
        return res || { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    };
  } catch (e) {
    // ignore
  }

  return <AdminSettingsClient initialProfile={initialProfile} serverUpdateRole={serverUpdateRole} />;
}

/*  Sub-components  */

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <GlassCard style={{ padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.forest, fontFamily: F.heading, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={18} color={C.emerald} /> {title}
      </h2>
      {children}
    </GlassCard>
  );
}

function InfoRow({ icon: Icon, label, value, isLink }: { icon: React.ElementType; label: string; value: string; isLink?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
      <Icon size={18} color={C.muted} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, color: C.muted, fontFamily: F.body }}>{label}</p>
        {isLink ? (
          <Link href={isLink} style={{ fontSize: 15, fontWeight: 600, color: C.forest, textDecoration: 'none', fontFamily: F.body }}>
            {value}
          </Link>
        ) : (
          <p style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: F.body }}>{value}</p>
        )}
      </div>
    </div>
  );
}

function SettingItem({ label, onClick, icon: Icon, isDanger = false, disabled = false, description }: { label: string; onClick: () => void; icon: React.ElementType; isDanger?: boolean; disabled?: boolean; description?: string }) {
  const color = isDanger ? '#EF4444' : C.text;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 8px', background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: 12, opacity: disabled ? 0.5 : 1, transition: 'background 0.2s' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(6,78,59,0.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon size={18} color={color} />
        <div style={{ textAlign: 'left' }}>
          <span style={{ fontWeight: 600, color, fontFamily: F.body, display: 'block' }}>{label}</span>
          {description && <span style={{ fontSize: 12, color: C.muted, display: 'block', fontFamily: F.body }}>{description}</span>}
        </div>
      </div>
      {!disabled && <ChevronRight size={16} color={C.muted} />}
    </button>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 48, height: 26, borderRadius: 100, border: 'none', cursor: 'pointer', padding: 2, transition: 'background 0.3s', background: checked ? C.emerald : 'rgba(6,78,59,0.15)', position: 'relative' }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'white', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', transition: 'transform 0.3s', transform: checked ? 'translateX(22px)' : 'translateX(0)' }} />
    </button>
  );
}
