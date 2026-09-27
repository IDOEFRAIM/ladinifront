'use client';

import { Leaf, MapPin, Building2 } from 'lucide-react';
import { C, ROLES, type OnboardingState, type ZoneOption, type OrgOption } from '@/features/auth/components/onboarding/onboarding.config';
import { SummaryRow } from '@/features/auth/components/onboarding/OnboardingParts';

interface Props {
  state: OnboardingState;
  zones: ZoneOption[];
  orgs: OrgOption[];
}

export default function Step4Confirmation({ state, zones, orgs }: Props) {
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
}
