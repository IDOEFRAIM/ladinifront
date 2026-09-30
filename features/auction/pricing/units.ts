/**
 * Unités du contrat de prix — MIROIR de `backend/src/ladini/domain/pricing_tiers.py`
 * (`_MASS_FACTORS`, `_VOLUME_FACTORS`) et de `commercial_offer.py` (`base_unit_for`, `unit_display`).
 *
 * C'est la seule table d'unités côté web. Elle ne doit pas diverger du backend : les vecteurs de
 * `__tests__/auction/fixtures/pricing-parity-vectors.json` (générés par Python) le verrouillent des DEUX côtés.
 */
import { D, Dec } from './fixed-decimal';

const MASS: Record<string, string> = {
  KG: '1', KGS: '1', KILO: '1', KILOS: '1', KILOGRAMME: '1', KILOGRAMMES: '1',
  G: '0.001', GRAMME: '0.001', GRAMMES: '0.001',
  TONNE: '1000', TONNES: '1000', TON: '1000', TONS: '1000', TONE: '1000', TONES: '1000', T: '1000',
};
const VOLUME: Record<string, string> = { L: '1', LITRE: '1', LITRES: '1' };

const has = (table: Record<string, string>, key: string) => Object.prototype.hasOwnProperty.call(table, key);

export const canonUnit = (unit: unknown): string | null => {
  const cleaned = String(unit ?? '').trim().toUpperCase();
  return cleaned || null;
};

/** MASS / VOLUME, sinon l'unité elle-même (SAC, BAG, TETE… : famille singleton, jamais convertie). */
export function unitFamily(unit: string): string {
  const u = unit.trim().toUpperCase();
  if (has(MASS, u)) return 'MASS';
  if (has(VOLUME, u)) return 'VOLUME';
  return u;
}

export function unitFactor(unit: string): Dec {
  const u = unit.trim().toUpperCase();
  if (has(MASS, u)) return D(MASS[u]);
  if (has(VOLUME, u)) return D(VOLUME[u]);
  return D(1);
}

/** KG pour la masse, LITRE pour le volume, sinon l'unité elle-même. */
export function baseUnitFor(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const code = unit.trim().toUpperCase();
  const family = unitFamily(code);
  if (family === 'MASS') return 'KG';
  if (family === 'VOLUME') return 'LITRE';
  return code;
}

/** Forme canonique d'une unité de masse/volume saisie côté web (« tonnes » → TONNE) ; inchangée sinon. */
export function canonicalWebUnit(unit: unknown): string | null {
  const u = canonUnit(unit);
  if (!u) return null;
  if (has(MASS, u)) return MASS[u] === '1000' ? 'TONNE' : MASS[u] === '0.001' ? 'G' : 'KG';
  if (has(VOLUME, u)) return 'LITRE';
  return u;
}

const LABELS: Record<string, [string, string]> = {
  LITRE: ['litre', 'litres'],
  KG: ['kg', 'kg'],
  TONNE: ['tonne', 'tonnes'],
  TETE: ['tête', 'têtes'],
  SAC: ['sac', 'sacs'],
  PANIER: ['panier', 'paniers'],
  UNITE: ['unité', 'unités'],
};

export function unitDisplay(unit: string | null | undefined, amount?: number | null): string {
  const code = String(unit ?? '').trim().toUpperCase();
  const [singular, plural] = LABELS[code] ?? [code.toLowerCase(), code.toLowerCase()];
  return amount != null && Math.abs(amount) > 1 ? plural : singular;
}

/** Miroir de `core/formatting.py::fmt_num` : espace comme séparateur de milliers, virgule décimale, 2 décimales max. */
export function fmtNum(value: Dec): string {
  const q = value.isInteger ? value : value.quantize(2);
  const plain = q.toPlain();
  const neg = plain.startsWith('-');
  const [int, frac] = (neg ? plain.slice(1) : plain).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg ? '-' : ''}${grouped}${frac ? `,${frac}` : ''}`;
}
