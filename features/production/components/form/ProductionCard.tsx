'use client';

import { Eye, EyeOff, CalendarClock, PackageCheck } from 'lucide-react';
import { C, F, GlassCard } from '@/features/production/components/tokens';
import type { PublicProduction } from '@/features/production/services/production.service';
import { VisibilityButton, chipStyle } from '@/features/production/components/form/ProductionFormParts';

interface Props {
  production: PublicProduction;
  onToggleVisibility: (p: PublicProduction, field: 'isPublic' | 'preorderEnabled', value: boolean) => void;
  onEdit: (p: PublicProduction) => void;
}

export default function ProductionCard({ production: p, onToggleVisibility, onEdit }: Props) {
  return (
    <GlassCard style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: F.heading, fontWeight: 800, color: C.text, fontSize: '1.05rem' }}>
            {p.productLabel}
            {p.productionType === 'LIVESTOCK' && p.species ? ` (${p.species}${p.breed ? ` · ${p.breed}` : ''})` : ''}
          </h3>
          <p style={{ fontFamily: F.body, fontSize: '0.75rem', color: C.muted, marginTop: 2 }}>
            {p.farm.name} · {p.productionType === 'LIVESTOCK' ? 'Élevage' : 'Culture'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12, fontSize: '0.75rem', color: C.text }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <PackageCheck size={14} color={C.emerald} />
              {p.availableQuantity - p.reservedQuantity}/{p.availableQuantity} {p.unit}
            </span>
            {p.pricePerUnit !== null && (
              <span style={{ fontWeight: 700, color: C.forest }}>
                {p.pricePerUnit.toLocaleString()} XOF
              </span>
            )}
            {p.estimatedAvailableAt && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CalendarClock size={14} color={C.amber} />
                {new Date(p.estimatedAvailableAt).toLocaleDateString('fr-FR')}
              </span>
            )}
            {p.productionType === 'LIVESTOCK' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <PackageCheck size={14} color={C.muted} />
                {p.currentStock} tête(s) restantes
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
        <VisibilityButton
          active={p.reservedQuantity >= 0}
          icon={<PackageCheck size={14} />}
          label={`${p.reservedQuantity} réservé(s)`}
          readOnly
        />
        <button onClick={() => onToggleVisibility(p, 'isPublic', true)} style={chipStyle(true)}>
          <Eye size={14} /> Public
        </button>
        <button onClick={() => onToggleVisibility(p, 'preorderEnabled', false)} style={chipStyle(false)}>
          <EyeOff size={14} /> Stopper précommandes
        </button>
        <button onClick={() => onEdit(p)} style={chipStyle(true)}>
          ✏️ Modifier
        </button>
      </div>
    </GlassCard>
  );
}
