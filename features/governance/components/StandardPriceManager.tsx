"use client";

import React from 'react';
import { useZone } from '@/context/ZoneContext';
import { useAuth } from '@/hooks/useAuth';
import ZoneSelector from '@/components/ui/ZoneSelector';
import { DollarSign, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { C } from '@/features/governance/components/price/price.config';
import { useStandardPrices } from '@/features/governance/components/price/useStandardPrices';
import CategoryPriceTable from '@/features/governance/components/price/CategoryPriceTable';

export default function StandardPriceManager() {
  const { zoneId } = useZone();
  const { userRole, activeOrg } = useAuth();
  const isAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || activeOrg?.role === 'ADMIN';
  const { rows, loading, saving, bulkSaving, message, updateRow, saveRow, saveAll, grouped, changedCount } = useStandardPrices(zoneId);

  return (
    <div>
      {/* Zone selector */}
      <div style={{ marginBottom: 16 }}>
        <ZoneSelector />
      </div>

      {!isAdmin && zoneId && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.9)', border: `1px solid ${C.border}`, color: C.muted }}>
          Seuls les administrateurs peuvent modifier les prix standards (lecture seule pour les autres rôles).
        </div>
      )}

      {!zoneId && (
        <div style={{
          padding: 40, textAlign: 'center', color: C.muted,
          background: C.glass, borderRadius: 14, border: `1px solid ${C.border}`,
        }}>
          <DollarSign size={40} style={{ color: C.border, marginBottom: 12 }} />
          <div style={{ fontWeight: 700 }}>Sélectionnez une zone</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Les prix standards sont définis par zone et par sous-catégorie de produit.
          </div>
        </div>
      )}

      {zoneId && loading && <div style={{ padding: 20, color: C.muted }}>Chargement des prix...</div>}

      {zoneId && !loading && rows.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center', color: C.muted,
          background: C.glass, borderRadius: 14, border: `1px solid ${C.border}`,
        }}>
          <AlertCircle size={40} style={{ color: C.amber, marginBottom: 12 }} />
          <div style={{ fontWeight: 700 }}>Aucune sous-catégorie trouvée</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Créez d&apos;abord des catégories et sous-catégories dans l&apos;onglet « Catégories ».
          </div>
        </div>
      )}

      {zoneId && !loading && rows.length > 0 && (
        <>
          {/* Message */}
          {message && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              borderRadius: 10, marginBottom: 16,
              background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: message.type === 'success' ? C.emerald : C.red, fontSize: 13, fontWeight: 600,
            }}>
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          {/* Bulk actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.muted }}>
              {rows.length} sous-catégories • {changedCount} modification(s) en attente
            </div>
            <button onClick={saveAll} disabled={!isAdmin || bulkSaving || changedCount === 0} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: changedCount > 0 ? C.forest : '#e5e7eb',
              color: changedCount > 0 ? '#fff' : C.muted,
              fontWeight: 700, fontSize: 13, opacity: bulkSaving ? 0.6 : 1,
            }}>
              <Save size={16} />
              {bulkSaving ? 'Enregistrement...' : `Enregistrer tout (${changedCount})`}
            </button>
          </div>

          {/* Price table by category */}
          {Array.from(grouped.entries()).map(([catName, catRows]) => (
            <CategoryPriceTable
              key={catName}
              catName={catName}
              rows={catRows}
              isAdmin={isAdmin}
              saving={saving}
              onUpdateRow={updateRow}
              onSaveRow={saveRow}
            />
          ))}
        </>
      )}
    </div>
  );
}
