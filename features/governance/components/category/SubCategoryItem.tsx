'use client';

import { Tag, Scale, Ruler, Lock, Unlock } from 'lucide-react';
import { C, type SubCategory } from '@/features/governance/components/category/category.config';
import MinimumEditor from '@/features/governance/components/category/MinimumEditor';
import UnitConfigEditor from '@/features/governance/components/category/UnitConfigEditor';
import type { useMinimumEditor } from '@/features/governance/components/category/useMinimumEditor';
import type { useUnitConfigEditor } from '@/features/governance/components/category/useUnitConfigEditor';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  sub: SubCategory;
  zoneId: string | null | undefined;
  isAdmin: boolean;
  toggling: string | null;
  onToggleBlock: (subCategoryId: string, currentlyBlocked: boolean) => void;
  minEditor: ReturnType<typeof useMinimumEditor>;
  unitEditor: ReturnType<typeof useUnitConfigEditor>;
}

export default function SubCategoryItem({ sub, zoneId, isAdmin, toggling, onToggleBlock, minEditor, unitEditor }: Props) {
  const isBlocked = zoneId ? sub.blockedZoneIds.includes(zoneId) : false;
  const priceForZone = zoneId
    ? sub.standardPrices.find((p: any) => p.zoneId === zoneId)
    : null;

  const hasMinimum = sub.minimumOrderQuantity != null;
  const hasUnitConfig = !!sub.allowedUnits && sub.allowedUnits.length > 0;
  return (
  <div style={{
    padding: '10px 0', borderBottom: `1px solid ${C.border}`,
    opacity: isBlocked ? 0.5 : 1,
  }}>
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Tag size={14} color={isBlocked ? C.red : C.emerald} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{sub.name}</div>
        <div style={{ fontSize: 12, color: C.muted }}>
          {sub._count?.products || 0} produits
          {priceForZone && (
            <span style={{ marginLeft: 8, color: C.emerald, fontWeight: 600 }}>
              • Prix: {priceForZone.pricePerUnit} FCFA/{priceForZone.unit || 'KG'}
            </span>
          )}
          {hasMinimum && (
            <span style={{ marginLeft: 8, color: C.amber, fontWeight: 600 }}>
              • Min. commande : {sub.minimumOrderQuantity} {sub.minimumOrderUnit}
            </span>
          )}
          {hasUnitConfig && (
            <span style={{ marginLeft: 8, color: '#0891B2', fontWeight: 600 }}>
              • Unité{(sub.allowedUnits?.length ?? 0) > 1 ? 's' : ''} : {sub.allowedUnits?.join(', ')}
              {sub.priorityUnit ? ` (prioritaire : ${sub.priorityUnit})` : ''}
            </span>
          )}
          {isBlocked && (
            <span style={{ marginLeft: 8, color: C.red, fontWeight: 600 }}>• BLOQUÉE</span>
          )}
        </div>
      </div>
    </div>

    {/* Actions */}
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {isAdmin && (
        <button
          onClick={() => (minEditor.minEditFor === sub.id ? minEditor.setMinEditFor(null) : minEditor.openMinEditor(sub))}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer',
            background: 'transparent', color: C.amber, fontWeight: 600, fontSize: 12,
          }}
        >
          <Scale size={14} />
          {hasMinimum ? 'Modifier le seuil' : 'Définir un seuil'}
        </button>
      )}
      {isAdmin && (
        <button
          onClick={() => (unitEditor.unitEditFor === sub.id ? unitEditor.setUnitEditFor(null) : unitEditor.openUnitEditor(sub))}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer',
            background: 'transparent', color: '#0891B2', fontWeight: 600, fontSize: 12,
          }}
        >
          <Ruler size={14} />
          {hasUnitConfig ? "Modifier l'unité" : "Configurer l'unité"}
        </button>
      )}
      {zoneId && (
        <button
          onClick={() => onToggleBlock(sub.id, isBlocked)}
          disabled={toggling === sub.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: isBlocked ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: isBlocked ? C.emerald : C.red,
            fontWeight: 600, fontSize: 12,
          }}
        >
          {isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
          {toggling === sub.id ? '...' : isBlocked ? 'Débloquer' : 'Bloquer'}
        </button>
      )}
    </div>
  </div>

  {minEditor.minEditFor === sub.id && (
    <MinimumEditor
      hasMinimum={hasMinimum}
      qty={minEditor.minQtyInput}
      onQtyChange={minEditor.setMinQtyInput}
      unit={minEditor.minUnitInput}
      onUnitChange={minEditor.setMinUnitInput}
      loading={minEditor.minLoading}
      message={minEditor.minMsg}
      onSave={() => minEditor.handleSaveMinimum(sub.id)}
      onClear={() => minEditor.handleClearMinimum(sub.id)}
      onCancel={() => { minEditor.setMinEditFor(null); minEditor.setMinMsg(null); }}
    />
  )}

  {unitEditor.unitEditFor === sub.id && (
    <UnitConfigEditor
      subId={sub.id}
      hasUnitConfig={hasUnitConfig}
      allowed={unitEditor.unitAllowedInput}
      onToggleUnit={unitEditor.toggleAllowedUnit}
      priority={unitEditor.unitPriorityInput}
      onPriorityChange={unitEditor.setUnitPriorityInput}
      loading={unitEditor.unitLoading}
      message={unitEditor.unitMsg}
      onSave={() => unitEditor.handleSaveUnitConfig(sub.id)}
      onClear={() => unitEditor.handleClearUnitConfig(sub.id)}
      onCancel={() => { unitEditor.setUnitEditFor(null); unitEditor.setUnitMsg(null); }}
    />
  )}
  </div>
  );
}
