'use client';

import { Building2, Plus, Check, Search } from 'lucide-react';
import { C, ORG_TYPES, type OnboardingState, type OrgOption } from '@/features/auth/components/onboarding/onboarding.config';
import { inputStyle, type SetField } from '@/features/auth/components/onboarding/onboarding-shared';

interface Props {
  state: OnboardingState;
  set: SetField;
  orgs: OrgOption[];
  orgSearch: string;
  onOrgSearchChange: (value: string) => void;
}

export default function Step2Organization({ state, set, orgs, orgSearch, onOrgSearchChange }: Props) {
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
            <input value={orgSearch} onChange={(e) => onOrgSearchChange(e.target.value)}
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
            style={{ ...inputStyle, appearance: 'none' }}>
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
}
