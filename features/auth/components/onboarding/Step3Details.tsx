'use client';

import { C, type OnboardingState, type BuyerTypeOption } from '@/features/auth/components/onboarding/onboarding.config';
import { inputStyle, type SetField } from '@/features/auth/components/onboarding/onboarding-shared';

interface Props {
  state: OnboardingState;
  set: SetField;
  buyerTypes: BuyerTypeOption[];
}

export default function Step3Details({ state, set, buyerTypes }: Props) {
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
}
