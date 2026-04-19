"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  getCategories,
  getStandardPrices,
  upsertStandardPrice,
} from '@/services/dr-governance.service';
import { useZone } from '@/context/ZoneContext';
import { useAuth } from '@/hooks/useAuth';
import ZoneSelector from '@/components/ui/ZoneSelector';
import { DollarSign, Save, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#EF4444',
  glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937',
};

const UNIT_OPTIONS = ['KG', 'TONNE', 'LITRE', 'BAG'] as const;

interface PriceRow {
  subCategoryId: string;
  subCategoryName: string;
  categoryName: string;
  currentPrice: number | null;
  currentUnit: string;
  newPrice: string;
  newUnit: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export default function StandardPriceManager() {
  const { zoneId } = useZone();
  const { userRole, activeOrg } = useAuth();
  const isAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || activeOrg?.role === 'ADMIN';
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    if (!zoneId) { setRows([]); return; }
    setLoading(true);
    try {
      // Load all categories/subcategories and existing prices for this zone
      const [catResult, priceResult] = await Promise.all([
        getCategories(),
        getStandardPrices(zoneId),
      ]);

      const priceMap = new Map<string, any>();
      if (priceResult.success && priceResult.data) {
        for (const p of priceResult.data) {
          priceMap.set(p.subCategoryId, p);
        }
      }

      if (catResult.success && catResult.data) {
        const newRows: PriceRow[] = [];
        for (const cat of catResult.data) {
          for (const sub of cat.subCategories) {
            const existing = priceMap.get(sub.id);
            newRows.push({
              subCategoryId: sub.id,
              subCategoryName: sub.name,
              categoryName: cat.name,
              currentPrice: existing?.pricePerUnit ?? null,
              currentUnit: existing?.unit || 'KG',
              newPrice: existing?.pricePerUnit != null ? String(existing.pricePerUnit) : '',
              newUnit: existing?.unit || 'KG',
              updatedBy: existing?.updatedBy?.name || existing?.updatedBy?.email || null,
              updatedAt: existing?.updatedAt ? new Date(existing.updatedAt).toLocaleDateString('fr-FR') : null,
            });
          }
        }
        setRows(newRows);
      }
    } catch (e) {
      console.error('Failed to load standard prices', e);
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateRow = (subCategoryId: string, field: 'newPrice' | 'newUnit', value: string) => {
    setRows(prev => prev.map(r => r.subCategoryId === subCategoryId ? { ...r, [field]: value } : r));
  };

  const saveRow = async (row: PriceRow) => {
    if (!zoneId) return;
    const price = parseFloat(row.newPrice);
    if (isNaN(price) || price <= 0) {
      setMessage({ text: `Prix invalide pour ${row.subCategoryName}`, type: 'error' });
      return;
    }

    setSaving(row.subCategoryId);
    setMessage(null);
    try {
      const res = await upsertStandardPrice({
        subCategoryId: row.subCategoryId,
        zoneId,
        pricePerUnit: price,
        unit: row.newUnit as any,
      });
      if (res.success) {
        setMessage({ text: `Prix mis à jour: ${row.subCategoryName} → ${price} FCFA/${row.newUnit}`, type: 'success' });
        loadData();
      } else {
        setMessage({ text: res.error || 'Erreur', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Erreur serveur', type: 'error' });
    } finally {
      setSaving(null);
    }
  };

  const saveAll = async () => {
    if (!zoneId) return;
    setBulkSaving(true);
    setMessage(null);
    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      const price = parseFloat(row.newPrice);
      if (isNaN(price) || price <= 0) continue; // skip empty/invalid

      // Only save if changed
      if (row.currentPrice === price && row.currentUnit === row.newUnit) continue;

      try {
        const res = await upsertStandardPrice({
          subCategoryId: row.subCategoryId,
          zoneId,
          pricePerUnit: price,
          unit: row.newUnit as any,
        });
        if (res.success) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }

    setBulkSaving(false);
    if (errorCount === 0 && successCount > 0) {
      setMessage({ text: `${successCount} prix mis à jour avec succès`, type: 'success' });
    } else if (errorCount > 0) {
      setMessage({ text: `${successCount} succès, ${errorCount} erreurs`, type: 'error' });
    } else {
      setMessage({ text: 'Aucun changement détecté', type: 'success' });
    }
    loadData();
  };

  // Group rows by category
  const grouped = new Map<string, PriceRow[]>();
  for (const row of rows) {
    const arr = grouped.get(row.categoryName) || [];
    arr.push(row);
    grouped.set(row.categoryName, arr);
  }

  const changedCount = rows.filter(r => {
    const p = parseFloat(r.newPrice);
    return !isNaN(p) && p > 0 && (r.currentPrice !== p || r.currentUnit !== r.newUnit);
  }).length;

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
            <div key={catName} style={{
              background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`,
              marginBottom: 16, overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 20px', background: 'rgba(6,78,59,0.03)',
                borderBottom: `1px solid ${C.border}`,
                fontWeight: 700, color: C.forest, fontSize: 14,
              }}>
                {catName}
              </div>

              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: C.muted, fontWeight: 600, fontSize: 12 }}>
                        Sous-catégorie
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: C.muted, fontWeight: 600, fontSize: 12 }}>
                        Prix actuel
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: C.muted, fontWeight: 600, fontSize: 12 }}>
                        Nouveau prix (FCFA)
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: C.muted, fontWeight: 600, fontSize: 12 }}>
                        Unité
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: C.muted, fontWeight: 600, fontSize: 12 }}>
                        Modifié par
                      </th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: C.muted, fontWeight: 600, fontSize: 12 }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {catRows.map(row => {
                      const priceNum = parseFloat(row.newPrice);
                      const changed = !isNaN(priceNum) && priceNum > 0 && (row.currentPrice !== priceNum || row.currentUnit !== row.newUnit);
                      return (
                        <tr key={row.subCategoryId} style={{
                          borderBottom: `1px solid ${C.border}`,
                          background: changed ? 'rgba(16,185,129,0.03)' : 'transparent',
                        }}>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: C.text }}>
                            {row.subCategoryName}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: C.muted }}>
                            {row.currentPrice != null ? (
                              <span style={{ fontWeight: 700 }}>{row.currentPrice} <span style={{ fontSize: 11 }}>FCFA/{row.currentUnit}</span></span>
                            ) : (
                              <span style={{ color: C.amber }}>Non défini</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={row.newPrice}
                                onChange={e => updateRow(row.subCategoryId, 'newPrice', e.target.value)}
                                disabled={!isAdmin}
                              style={{
                                width: 120, padding: '8px 12px', borderRadius: 8,
                                border: `1px solid ${changed ? C.emerald : C.border}`,
                                textAlign: 'right', fontSize: 14, fontWeight: 600,
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <select
                              value={row.newUnit}
                              onChange={e => updateRow(row.subCategoryId, 'newUnit', e.target.value)}
                              disabled={!isAdmin}
                              style={{
                                padding: '8px 12px', borderRadius: 8,
                                border: `1px solid ${C.border}`, fontSize: 13,
                              }}
                            >
                              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: 12, color: C.muted }}>
                            {row.updatedBy ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>{row.updatedBy}</div>
                                <div>{row.updatedAt}</div>
                              </div>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              onClick={() => saveRow(row)}
                              disabled={!isAdmin || !changed || saving === row.subCategoryId}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '6px 12px', borderRadius: 8, border: 'none',
                                cursor: changed ? 'pointer' : 'default',
                                background: changed ? C.emerald : '#e5e7eb',
                                color: changed ? '#fff' : C.muted,
                                fontWeight: 600, fontSize: 12, opacity: saving === row.subCategoryId ? 0.6 : 1,
                              }}
                            >
                              {saving === row.subCategoryId ? '...' : <><TrendingUp size={12} /> Sauver</>}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
