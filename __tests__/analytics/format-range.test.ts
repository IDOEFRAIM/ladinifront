import { describe, expect, it } from 'vitest';
import { DASH, fmtDelta, fmtQuantity, fmtValue } from '@/features/analytics/format';
import { apiParams, parseUrlState, toQuery } from '@/features/analytics/range';

const NOW = new Date('2026-09-27T10:00:00Z');
const q = (s: string) => new URLSearchParams(s);
const UUID = '3f2b8c1e-9a4d-4b7e-8c21-5d6e7f8a9b0c';

describe('formatage (jamais de null vers 0)', () => {
  it('null et undefined deviennent un tiret, jamais 0 % ni 0', () => {
    expect(fmtValue(null, 'ratio')).toBe(DASH);
    expect(fmtValue(undefined, 'count')).toBe(DASH);
    expect(fmtQuantity(null, 'KG')).toBe(DASH);
    expect(fmtValue(0, 'ratio')).toContain('0'); // un vrai zéro reste un zéro
  });
  it('un ratio de fenêtre commandes/recherche nest jamais présenté comme un pourcentage et peut dépasser 1', () => {
    const v = fmtValue(1.5, 'orders_per_search');
    expect(v).toContain('cmd/recherche');
    expect(v).not.toContain('%');
  });
  it('une quantité porte toujours son unité canonique', () => {
    expect(fmtQuantity(4200, 'KG')).toMatch(/4\s?200 KG/);
    expect(fmtQuantity(73, 'TETE')).toContain('TETE');
  });
  it('delta dun taux en points de pourcentage, delta relatif sinon', () => {
    expect(fmtDelta({ delta: 0.08, delta_kind: 'percentage_points', delta_points: 8, delta_pct: null })).toBe('+8 pts');
    expect(fmtDelta({ delta: -0.025, delta_kind: 'percentage_points', delta_points: -2.5, delta_pct: null })).toBe('−2,5 pts');
    expect(fmtDelta({ delta: 200, delta_kind: 'relative', delta_pct: 0.2 })).toBe('+20 %');
    expect(fmtDelta({ delta: null, delta_kind: 'relative', delta_pct: null })).toBeNull();
  });
});

describe('période et état dURL (jours UTC)', () => {
  it('30 jours par défaut : 30 jours UTC, aujourdhui inclus', () => {
    const s = parseUrlState(q(''), NOW);
    expect(s.period).toBe('30d');
    expect(s.to).toBe('2026-09-27');
    expect(s.from).toBe('2026-08-29');
  });
  it('presets 7 et 90 jours', () => {
    expect(parseUrlState(q('period=7d'), NOW).from).toBe('2026-09-21');
    expect(parseUrlState(q('period=90d'), NOW).from).toBe('2026-06-30');
  });
  it('la borne de jour est UTC, pas locale : 00:30 à UTC+2 est encore la veille en UTC', () => {
    const localMidnightPlus30 = new Date('2026-09-01T00:30:00+02:00'); // = 2026-08-31T22:30Z
    expect(parseUrlState(q('period=7d'), localMidnightPlus30).to).toBe('2026-08-31');
  });
  it('période personnalisée valide conservée ; invalide ou inversée ramenée à 30 j', () => {
    expect(parseUrlState(q('period=custom&from=2026-09-01&to=2026-09-10'), NOW)).toMatchObject({ from: '2026-09-01', to: '2026-09-10' });
    expect(parseUrlState(q('period=custom&from=2026-09-10&to=2026-09-01'), NOW).to).toBe('2026-09-27');
    expect(parseUrlState(q('period=custom&from=2026-09-01T00:00:00Z&to=2026-09-10'), NOW).to).toBe('2026-09-27');
  });
  it('les identifiants dURL non-UUID sont ignorés (entrée non fiable)', () => {
    const s = parseUrlState(q(`zone=${UUID}&category=oups&sub=%27%3B--&tab=tenders`), NOW);
    expect(s.zone).toBe(UUID);
    expect(s.category).toBe('');
    expect(s.sub).toBe('');
    expect(s.tab).toBe('tenders');
    expect(parseUrlState(q('tab=admin'), NOW).tab).toBe('direct');
  });
  it('aller-retour URL : valeurs par défaut omises', () => {
    expect(toQuery(parseUrlState(q(''), NOW))).toBe('');
    const s = parseUrlState(q(`period=90d&zone=${UUID}&tab=recurring`), NOW);
    expect(toQuery(s)).toBe(`period=90d&zone=${UUID}&tab=recurring`);
  });
  it('paramètres dAPI avec les noms du backend', () => {
    const s = parseUrlState(q(`zone=${UUID}&category=${UUID}`), NOW);
    expect(apiParams(s)).toEqual({ from: '2026-08-29', to: '2026-09-27', zone_id: UUID, category_id: UUID });
  });
});
