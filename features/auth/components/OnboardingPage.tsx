'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Loader2, Leaf, MapPin, Building2, Plus, ChevronRight, ChevronLeft, Check, Search } from 'lucide-react';
import { fetchOnboardingZonesAction, fetchOnboardingOrganizationsAction, fetchOnboardingBuyerTypesAction, completeOnboardingAction } from '@/features/auth/actions/onboarding.actions';
import { C, STEPS, Step, ROLES, ORG_TYPES, ZoneOption, OrgOption, BuyerTypeOption, OnboardingState, initialState } from '@/features/auth/components/onboarding/onboarding.config';
import { Stepper } from '@/features/auth/components/onboarding/OnboardingParts';
import Step0Role from '@/features/auth/components/onboarding/Step0Role';
import Step1Zone from '@/features/auth/components/onboarding/Step1Zone';
import Step2Organization from '@/features/auth/components/onboarding/Step2Organization';
import Step3Details from '@/features/auth/components/onboarding/Step3Details';
import Step4Confirmation from '@/features/auth/components/onboarding/Step4Confirmation';


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
          {step === 0 && <Step0Role state={state} set={set} />}
          {step === 1 && <Step1Zone state={state} set={set} zones={zones} zoneSearch={zoneSearch} onZoneSearchChange={setZoneSearch} />}
          {step === 2 && <Step2Organization state={state} set={set} orgs={orgs} orgSearch={orgSearch} onOrgSearchChange={setOrgSearch} />}
          {step === 3 && <Step3Details state={state} set={set} buyerTypes={buyerTypes} />}
          {step === 4 && <Step4Confirmation state={state} zones={zones} orgs={orgs} />}
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
