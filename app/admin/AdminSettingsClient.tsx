"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Settings, ShieldCheck, Palette, Lock, LogOut, ChevronRight, Database, RefreshCw, XCircle, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { VALID_SYSTEM_ROLES } from '@/lib/validators';
import { useRouter } from 'next/navigation';

const C = { forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

type AdminProfile = { id?: string; name: string; role: string; theme: 'light' | 'dark' };

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}>
      {children}
    </div>
  );
}

export default function AdminSettingsClient({ initialProfile, serverUpdateRole }: { initialProfile: AdminProfile; serverUpdateRole?: (role: string, targetUserId?: string) => Promise<any> }) {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile>(initialProfile || { name: '', role: '', theme: 'light' });
  const [isLoading, setIsLoading] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [roleDraft, setRoleDraft] = useState<string>(initialProfile?.role || '');

  const toggleTheme = () => {
    const newTheme = profile.theme === 'light' ? 'dark' : 'light';
    setProfile(prev => ({ ...prev, theme: newTheme }));
    alert(`Thème passé à : ${newTheme} (Simulé)`);
  };

  const handleDatabaseMaintenance = () => {
    setIsLoading(true);
    alert("L'optimisation des index de la base de données est lancée... (Simulé)");
    setTimeout(() => { alert("Maintenance terminée."); setIsLoading(false); }, 2000);
  };

  const handleClearLocalCache = () => {
    if (window.confirm("Voulez-vous effacer le cache local (IndexéDB/Service Worker) ?")) {
      alert("Cache local effacé. La page va se recharger. (Simulé)");
      window.location.reload();
    }
  };

  const handleLogout = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vous déconnecter de la console Admin ?")) {
      alert("Déconnexion Admin réussie !");
      router.push('/login');
    }
  };

  const handleSaveRole = async () => {
    setIsLoading(true);
    try {
      const targetUserId = profile.id;
      if (typeof serverUpdateRole === 'function') {
        const r = await serverUpdateRole(roleDraft, targetUserId);
        if (r && (r.success || r.id || r.role)) {
          setProfile(p => ({ ...p, role: roleDraft }));
          setEditingRole(false);
          toast.success('Rôle mis à jour');
          return;
        } else {
          toast.error(r?.error || 'Erreur');
        }
      } else {
        // fallback to legacy API
        const res = await fetch('/api/admin/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: roleDraft, targetUserId }) });
        const j = await res.json();
        if (j.success) {
          setProfile(p => ({ ...p, role: roleDraft }));
          setEditingRole(false);
          toast.success('Rôle mis à jour');
        } else {
          toast.error(j.error || 'Erreur');
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.sand, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: C.glass, backdropFilter: 'blur(20px)', padding: '20px 24px', position: 'sticky', top: 64, zIndex: 10, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.forest, fontFamily: F.heading }}>Paramètres Admin</h1>
            <p style={{ fontSize: 13, color: C.muted, fontFamily: F.body }}>Gestion du compte superviseur et maintenance système</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Profile Section */}
        <Section title="Profil Administrateur" icon={ShieldCheck}>
          <InfoRow icon={ShieldCheck} label="Nom / Rôle" value={`${profile.name} (${profile.role})`} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Rôle</label>
              {editingRole ? (
                <select value={roleDraft} onChange={e => setRoleDraft(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
                  <option value="">Choisir un rôle</option>
                  {VALID_SYSTEM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <div style={{ fontWeight: 700 }}>{profile.role}</div>
              )}
            </div>
            <div>
              {editingRole ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveRole} disabled={isLoading} style={{ padding: '8px 14px', borderRadius: 8, background: '#10b981', color: 'white' }}>{isLoading ? '...' : 'Enregistrer'}</button>
                  <button onClick={() => setEditingRole(false)} style={{ padding: '8px 14px', borderRadius: 8 }}>Annuler</button>
                </div>
              ) : (
                <button onClick={() => setEditingRole(true)} style={{ padding: '8px 14px', borderRadius: 8 }}>Modifier</button>
              )}
            </div>
          </div>
          <InfoRow icon={Lock} label="Sécurité" value="Changer le mot de passe" isLink="/admin/password-reset" />
        </Section>

        {/* Display Section */}
        <Section title="Affichage" icon={Palette}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {profile.theme === 'dark' ? <Moon size={18} color={C.forest} /> : <Sun size={18} color={C.amber} />}
              <span style={{ fontWeight: 600, color: C.text, fontFamily: F.body }}>Mode Sombre (Dark Mode)</span>
            </div>
            <ToggleSwitch checked={profile.theme === 'dark'} onChange={toggleTheme} />
          </div>
        </Section>

        {/* Resilience Section */}
        <Section title="Outils de Résilience et Maintenance" icon={Database}>
          <SettingItem label="Lancer la Maintenance Serveur" onClick={handleDatabaseMaintenance} icon={RefreshCw} disabled={isLoading}
            description={isLoading ? 'Optimisation en cours...' : 'Optimisation des tables et purge des logs non critiques.'} />
          <SettingItem label="Vider le Cache Local" onClick={handleClearLocalCache} icon={XCircle} isDanger
            description="Force le re-téléchargement de tous les catalogues et images." />
        </Section>

        {/* Session Section */}
        <Section title="Session" icon={LogOut}>
          <SettingItem label="Déconnexion de la Console" onClick={handleLogout} icon={LogOut} isDanger />
        </Section>
      </div>
    </div>
  );
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
