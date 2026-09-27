'use client';

import { TrendingUp } from 'lucide-react';
import { C, UNIT_OPTIONS, type PriceRow } from '@/features/governance/components/price/price.config';

interface Props {
  catName: string;
  rows: PriceRow[];
  isAdmin: boolean;
  saving: string | null;
  onUpdateRow: (subCategoryId: string, field: 'newPrice' | 'newUnit', value: string) => void;
  onSaveRow: (row: PriceRow) => void;
}

/** Tableau des prix d'une catégorie (une ligne par sous-catégorie). */
export default function CategoryPriceTable({ catName, rows: catRows, isAdmin, saving, onUpdateRow, onSaveRow }: Props) {
  return (
  <div style={{
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
                      onChange={e => onUpdateRow(row.subCategoryId, 'newPrice', e.target.value)}
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
                    onChange={e => onUpdateRow(row.subCategoryId, 'newUnit', e.target.value)}
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
                    onClick={() => onSaveRow(row)}
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
  );
}
