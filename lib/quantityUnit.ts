/**
 * Quantity / unit conversion — single source of truth (web side).
 *
 * Mirror of the agent's `services/domain/quantity_unit.py::convert_quantity`
 * (AgriConnect backend, Python) — SAME semantics, deliberately kept minimal
 * and conservative: only units with a FIXED, universal factor (weight: KG,
 * TONNE) convert automatically. Everything else (SAC, BAG, LITRE vs weight,
 * etc.) has no safe conversion — callers must NEVER guess, only refuse
 * explicitly. Two separate languages/repos can't literally share one
 * implementation, but this file is the ONE place on the web side that knows
 * how to convert a quantity; never duplicate this logic inline elsewhere.
 */

const UNIT_TO_KG: Record<string, number> = {
  KG: 1,
  TONNE: 1000,
};

// Liste FERMÉE des unités reconnues par le backend agent (domain/quantity_unit.py::UNIT_SYNONYMS),
// utilisée pour la config allowedUnits/priorityUnit par sous-catégorie (voir
// services/dr-governance.service.ts::updateSubCategoryUnitConfig). Vit ici — et pas dans
// dr-governance.service.ts — car ce fichier a `'use server'` et ne peut exporter QUE des
// fonctions async (Next.js Server Actions) ; toute autre valeur exportée casse le build
// ("A 'use server' file can only export async functions, found object").
export const SUB_CATEGORY_UNITS = ['KG', 'TONNE', 'SAC', 'PANIER', 'TETE', 'UNITE', 'LITRE'] as const;
export type SubCategoryUnit = typeof SUB_CATEGORY_UNITS[number];

export function normalizeUnit(raw: string | null | undefined): string {
  return String(raw ?? '').trim().toUpperCase();
}

/**
 * Convert `quantity` from `fromUnit` to `toUnit`. Returns `null` when no
 * safe, universal conversion exists (e.g. BAG/SAC has no fixed kg-equivalent)
 * — the caller must ask the user to restate the quantity in the target unit,
 * never guess a rate.
 */
export function convertQuantity(
  quantity: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (!from || !to) return null;
  if (from === to) return quantity;
  const fromKg = UNIT_TO_KG[from];
  const toKg = UNIT_TO_KG[to];
  if (fromKg === undefined || toKg === undefined) return null;
  return (quantity * fromKg) / toKg;
}
