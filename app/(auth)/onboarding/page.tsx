'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  Loader2, Leaf, ShoppingCart, Truck, MapPin, Building2, Plus,
  ChevronRight, ChevronLeft, Check, Search,
} from 'lucide-react';
import {
  fetchOnboardingZonesAction,
  fetchOnboardingOrganizationsAction,
  fetchOnboardingBuyerTypesAction,
  completeOnboardingAction,
} from '@/app/actions/onboarding.server';

// ── Design tokens ──────────────────────────────────────────────────────
const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
  danger: '#DC2626',
};

const STEPS = ['Rôle', 'Zone', 'Organisation', 'Détails', 'Confirmation'] as const;
type Step = 0 | 1 | 2 | 3 | 4;

const ROLES = [
  { value: 'PRODUCER' as const, label: 'Producteur', desc: 'Je produis et vends des récoltes', icon: Leaf, color: '#10B981' },
  { value: 'BUYER' as const, label: 'Acheteur B2B', desc: 'Je suis restaurateur, hôtelier ou revendeur', icon: ShoppingCart, color: '#D97706' },
  { value: 'AGENT' as const, label: 'Livreur', desc: 'Je livre les commandes sur le terrain', icon: Truck, color: '#3B82F6' },
] as const;

const ORG_TYPES = [
  { value: 'COOPERATIVE', label: 'Coopérative' },
  { value: 'GOVERNMENT_REGIONAL', label: 'Gouvernement régional' },
  { value: 'NGO', label: 'ONG' },
  { value: 'PRIVATE_TRADER', label: 'Commerçant privé' },
  { value: 'RESELLER', label: 'Revendeur' },
] as const;

type OnboardingRole = 'PRODUCER' | 'BUYER' | 'AGENT';
type ZoneOption = { id: string; name: string; code: string };
type OrgOption = { id: string; name: string; type: string };
type BuyerTypeOption = { id: string; name: string; description: string | null };

// ── Onboarding State ──────────────────────────────────────────────────
interface OnboardingState {
  role: OnboardingRole | null;
  zoneId: string | null;
  organizationId: string | null;
  createOrg: boolean;
  orgName: string;
  orgType: string;
  orgTaxId: string;
  orgDescription: string;
  // Role-specific
  businessName: string;
  buyerTypeId: string | null;
  establishmentName: string;
  defaultDeliveryAddress: string;
  vehicleType: string;
  licenseNumber: string;
}

const initialState: OnboardingState = {
  role: null, zoneId: null, organizationId: null, createOrg: false,
  orgName: '', orgType: 'COOPERATIVE', orgTaxId: '', orgDescription: '',
  businessName: '', buyerTypeId: null, establishmentName: '', defaultDeliveryAddress: '',
  vehicleType: '', licenseNumber: '',
};

// ── Stepper Component ──────────────────────────────────────────────────
function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: i <= current ? C.emerald : 'rgba(6,78,59,0.08)',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { isLoading, isAuthenticated, onboardingCompleted, user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [state, setState] = useState<OnboardingState>(initialState);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [buyerTypes, setBuyerTypes] = useState<BuyerTypeOption[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [zoneSearch, setZoneSearch] = useState('');
  const [orgSearch, setOrgSearch] = useState('');

  const set = useCallback(<K extends keyof OnboardingState>(key: K, val: OnboardingState[K]) => {
    setState((s) => ({ ...s, [key]: val }));
  }, []);

  // Load data on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      const [zRes, oRes, bRes] = await Promise.all([
        fetchOnboardingZonesAction(),
        fetchOnboardingOrganizationsAction(),
        fetchOnboardingBuyerTypesAction(),
      ]);
      if (!mounted) return;
      if (zRes.success && zRes.data) setZones(zRes.data);
      if (oRes.success && oRes.data) setOrgs(oRes.data);
      if (bRes.success && bRes.data) setBuyerTypes(bRes.data);
      setDataLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Redirect if already onboarded or not authenticated
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (onboardingCompleted) {
      const roleMap: Record<string, string> = { PRODUCER: '/dashboard', BUYER: '/buyer-dashboard', AGENT: '/agent/deliveries' };
      router.replace(roleMap[(user?.role || '').toUpperCase()] || '/market');
    }
  }, [isLoading, isAuthenticated, onboardingCompleted, user, router]);

  // ── Step validation ──────────────────────────────────────────────────
  const canNext = (): boolean => {
    switch (step) {
      case 0: return !!state.role;
      case 1: return !!state.zoneId;
      case 2: {
        if (state.createOrg) return state.orgName.length >= 2 && !!state.orgType;
        return true; // joining optional
      }
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const goNext = () => { if (canNext() && step < 4) setStep((s) => (s + 1) as Step); };
  const goBack = () => { if (step > 0) setStep((s) => (s - 1) as Step); };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!state.role || !state.zoneId) return;
    setSubmitting(true);
    const result = await completeOnboardingAction({
      role: state.role,
      zoneId: state.zoneId,
      organizationId: state.organizationId || undefined,
      createOrg: state.createOrg || undefined,
      orgName: state.createOrg ? state.orgName : undefined,
      orgType: state.createOrg ? state.orgType as any : undefined,
      orgTaxId: state.createOrg && state.orgTaxId ? state.orgTaxId : undefined,
      orgDescription: state.createOrg && state.orgDescription ? state.orgDescription : undefined,
      businessName: state.role === 'PRODUCER' ? state.businessName || undefined : undefined,
      buyerTypeId: state.role === 'BUYER' ? state.buyerTypeId || undefined : undefined,
      establishmentName: state.role === 'BUYER' ? state.establishmentName || undefined : undefined,
      defaultDeliveryAddress: state.role === 'BUYER' ? state.defaultDeliveryAddress || undefined : undefined,
      vehicleType: state.role === 'AGENT' ? state.vehicleType || undefined : undefined,
      licenseNumber: state.role === 'AGENT' ? state.licenseNumber || undefined : undefined,
    });
    setSubmitting(false);

    if (result.success) {
      toast.success('Bienvenue sur Ladini !');
      const roleMap: Record<string, string> = { PRODUCER: '/dashboard', BUYER: '/buyer-dashboard', AGENT: '/agent/deliveries' };
      window.location.href = roleMap[state.role] || '/market';
    } else {
      toast.error(result.error || 'Erreur lors de la finalisation');
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────
  if (isLoading || dataLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
        <Loader2 size={36} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: C.muted, marginTop: 16 }}>Préparation...</p>
      </div>
    );
  }

  // ── Shared styles ─────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.6)',
    fontFamily: "'Inter', sans-serif", fontSize: 15, color: C.forest,
    outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
  };

  // ── Step Renders ──────────────────────────────────────────────────────

  const renderStep0 = () => (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 6 }}>Quel est votre rôle ?</h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Choisissez le profil qui vous correspond</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ROLES.map((r) => {
          const active = state.role === r.value;
          return (
            <button key={r.value} type="button" onClick={() => set('role', r.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: 20, borderRadius: 20, cursor: 'pointer',
                border: `2px solid ${active ? r.color : C.border}`,
                background: active ? `${r.color}08` : 'rgba(255,255,255,0.5)',
                transition: 'all 0.25s', textAlign: 'left',
                minHeight: 80,
              }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: active ? `${r.color}15` : 'rgba(100,116,139,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.25s',
              }}>
                <r.icon size={24} style={{ color: active ? r.color : C.muted }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: active ? C.forest : C.muted }}>{r.label}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.muted, marginTop: 2 }}>{r.desc}</div>
              </div>
              {active && (
                <div style={{ width: 24, height: 24, borderRadius: 12, background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={14} style={{ color: '#fff' }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep1 = () => {
    const filtered = zones.filter((z) => {
      if (!zoneSearch) return true;
      const q = zoneSearch.toLowerCase();
      return z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q);
    });
    return (
      <div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 6 }}>Votre zone d'activité</h2>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Sélectionnez la zone où vous opérez</p>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, opacity: 0.6 }} />
          <input value={zoneSearch} onChange={(e) => setZoneSearch(e.target.value)}
            placeholder="Rechercher une zone..." style={{ ...inputStyle, paddingLeft: 42 }} />
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 20 }}>Aucune zone trouvée</p>
          ) : filtered.map((z) => {
            const active = state.zoneId === z.id;
            return (
              <button key={z.id} type="button" onClick={() => set('zoneId', z.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                  border: `2px solid ${active ? C.emerald : C.border}`,
                  background: active ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s', textAlign: 'left', minHeight: 52,
                }}>
                <MapPin size={18} style={{ color: active ? C.emerald : C.muted, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: active ? C.forest : C.muted }}>{z.name}</span>
                  <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>{z.code}</span>
                </div>
                {active && <Check size={16} style={{ color: C.emerald, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    const filteredOrgs = orgs.filter((o) => {
      if (!orgSearch) return true;
      return o.name.toLowerCase().includes(orgSearch.toLowerCase());
    });
    return (
      <div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 6 }}>Organisation</h2>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Rejoignez une organisation existante, créez la vôtre ou passez cette étape pour plus tard.</p>

        {/* Toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" onClick={() => { set('createOrg', false); set('orgName', ''); set('organizationId', null); }}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
              border: `2px solid ${!state.createOrg ? C.emerald : C.border}`,
              background: !state.createOrg ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.5)',
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
              color: !state.createOrg ? C.forest : C.muted, transition: 'all 0.2s',
            }}>
            <Building2 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Rejoindre
          </button>
          <button type="button" onClick={() => { set('createOrg', true); set('organizationId', null); }}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
              border: `2px solid ${state.createOrg ? C.amber : C.border}`,
              background: state.createOrg ? 'rgba(217,119,6,0.06)' : 'rgba(255,255,255,0.5)',
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700,
              color: state.createOrg ? C.forest : C.muted, transition: 'all 0.2s',
            }}>
            <Plus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Créer
          </button>
        </div>

        {!state.createOrg ? (
          <>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, opacity: 0.6 }} />
              <input value={orgSearch} onChange={(e) => setOrgSearch(e.target.value)}
                placeholder="Rechercher une organisation..." style={{ ...inputStyle, paddingLeft: 42 }} />
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredOrgs.length === 0 ? (
                <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 20 }}>Aucune organisation trouvée</p>
              ) : filteredOrgs.map((o) => {
                const active = state.organizationId === o.id;
                return (
                  <button key={o.id} type="button" onClick={() => set('organizationId', o.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                      border: `2px solid ${active ? C.emerald : C.border}`,
                      background: active ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.2s', textAlign: 'left', minHeight: 52,
                    }}>
                    <Building2 size={18} style={{ color: active ? C.emerald : C.muted, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: active ? C.forest : C.muted }}>{o.name}</span>
                      <span style={{ fontSize: 11, color: C.muted, marginLeft: 8, textTransform: 'lowercase' }}>{o.type.replace(/_/g, ' ')}</span>
                    </div>
                    {active && <Check size={16} style={{ color: C.emerald, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={state.orgName} onChange={(e) => set('orgName', e.target.value)}
              placeholder="Nom de l'organisation *" style={inputStyle} />
            <select value={state.orgType} onChange={(e) => set('orgType', e.target.value)}
              style={{ ...inputStyle, appearance: 'none' as any }}>
              {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={state.orgTaxId} onChange={(e) => set('orgTaxId', e.target.value)}
              placeholder="Identifiant fiscal (optionnel)" style={inputStyle} />
            <textarea value={state.orgDescription} onChange={(e) => set('orgDescription', e.target.value)}
              placeholder="Description (optionnelle)" rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
          </div>
        )}
      </div>
    );
  };

  const renderStep3 = () => {
    if (state.role === 'PRODUCER') {
      return (
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 6 }}>Profil producteur</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Quelques informations sur votre activité</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Nom commercial</label>
              <input value={state.businessName} onChange={(e) => set('businessName', e.target.value)}
                placeholder="Ex: Ferme Sawadogo" style={inputStyle} />
            </div>
          </div>
        </div>
      );
    }

    if (state.role === 'BUYER') {
      return (
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 6 }}>Profil acheteur</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Décrivez votre établissement</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {buyerTypes.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>Type d'établissement</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {buyerTypes.map((bt) => {
                    const active = state.buyerTypeId === bt.id;
                    return (
                      <button key={bt.id} type="button" onClick={() => set('buyerTypeId', bt.id)}
                        style={{
                          padding: '10px 18px', borderRadius: 100, cursor: 'pointer',
                          border: `2px solid ${active ? C.amber : C.border}`,
                          background: active ? 'rgba(217,119,6,0.08)' : 'rgba(255,255,255,0.5)',
                          fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700,
                          color: active ? C.forest : C.muted, transition: 'all 0.2s',
                        }}>
                        {bt.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Nom de l'établissement</label>
              <input value={state.establishmentName} onChange={(e) => set('establishmentName', e.target.value)}
                placeholder="Ex: Hôtel Splendid" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Adresse de livraison</label>
              <input value={state.defaultDeliveryAddress} onChange={(e) => set('defaultDeliveryAddress', e.target.value)}
                placeholder="Adresse de livraison par défaut" style={inputStyle} />
            </div>
          </div>
        </div>
      );
    }

    if (state.role === 'AGENT') {
      return (
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 6 }}>Profil livreur</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Informations sur votre véhicule</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Type de véhicule</label>
              <input value={state.vehicleType} onChange={(e) => set('vehicleType', e.target.value)}
                placeholder="Ex: Moto, Tricycle, Camionnette" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 6 }}>Numéro de permis</label>
              <input value={state.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)}
                placeholder="Numéro de permis (optionnel)" style={inputStyle} />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderStep4 = () => {
    const selectedZone = zones.find((z) => z.id === state.zoneId);
    const selectedOrg = state.createOrg ? null : orgs.find((o) => o.id === state.organizationId);
    const orgLabel = state.createOrg
      ? (state.orgName ? `${state.orgName} (nouvelle)` : 'Nouvelle organisation')
      : (selectedOrg?.name || 'Aucune (plus tard)');
    const roleInfo = ROLES.find((r) => r.value === state.role);

    return (
      <div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 6 }}>Confirmation</h2>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Vérifiez vos informations avant de valider</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SummaryRow label="Rôle" value={roleInfo?.label || ''} icon={<Leaf size={16} />} />
          <SummaryRow label="Zone" value={selectedZone?.name || ''} icon={<MapPin size={16} />} />
          <SummaryRow label="Organisation" value={orgLabel} icon={<Building2 size={16} />} />
          {state.role === 'PRODUCER' && state.businessName && (
            <SummaryRow label="Nom commercial" value={state.businessName} />
          )}
          {state.role === 'BUYER' && state.establishmentName && (
            <SummaryRow label="Établissement" value={state.establishmentName} />
          )}
          {state.role === 'AGENT' && state.vehicleType && (
            <SummaryRow label="Véhicule" value={state.vehicleType} />
          )}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand, padding: 16 }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse at 60% 20%, rgba(16,185,129,0.04) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, rgba(217,119,6,0.03) 0%, transparent 50%)' }} />

      <div style={{
        position: 'relative', zIndex: 1,
        background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 32, border: `1px solid ${C.border}`, padding: '28px 28px 24px',
        width: '100%', maxWidth: 460, boxShadow: '0 8px 40px rgba(6,78,59,0.06)',
      }}>
        <Stepper current={step} total={STEPS.length} />

        <div style={{ minHeight: 340 }}>
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          {step > 0 && (
            <button type="button" onClick={goBack} disabled={submitting}
              style={{
                flex: 1, padding: '14px 20px', borderRadius: 100, cursor: 'pointer',
                border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.6)',
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13,
                color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s', minHeight: 48,
              }}>
              <ChevronLeft size={16} /> Retour
            </button>
          )}

          {step < 4 ? (
            <button type="button" onClick={goNext} disabled={!canNext()}
              style={{
                flex: step === 0 ? 1 : 2, padding: '14px 20px', borderRadius: 100, cursor: 'pointer',
                border: 'none', background: canNext() ? C.forest : 'rgba(100,116,139,0.15)',
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: canNext() ? '0 4px 16px rgba(6,78,59,0.15)' : 'none',
                transition: 'all 0.2s', opacity: canNext() ? 1 : 0.5, minHeight: 48,
              }}>
              Continuer <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting}
              style={{
                flex: 2, padding: '14px 20px', borderRadius: 100, cursor: 'pointer',
                border: 'none', background: C.emerald, color: '#fff',
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(16,185,129,0.2)',
                transition: 'all 0.2s', opacity: submitting ? 0.6 : 1, minHeight: 48,
              }}>
              {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
                <>
                  <Check size={18} /> Valider mon profil
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Summary Row ──────────────────────────────────────────────────────────
function SummaryRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 14,
      background: 'rgba(16,185,129,0.04)', border: `1px solid ${C.border}`,
    }}>
      {icon && <div style={{ color: C.emerald, flexShrink: 0 }}>{icon}</div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.forest, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}
