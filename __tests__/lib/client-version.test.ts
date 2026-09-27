import { describe, it, expect } from 'vitest';
import { isOutdated } from '@/lib/client-version';

describe('isOutdated', () => {
  it('détecte une version différente', () => expect(isOutdated('abc123', 'def456')).toBe(true));
  it('même version : à jour', () => expect(isOutdated('abc123', 'abc123')).toBe(false));
  it('entête absent ou version inconnue : jamais périmé (pas de faux positif)', () => {
    expect(isOutdated('abc123', null)).toBe(false);
    expect(isOutdated('abc123', 'unknown')).toBe(false);
    expect(isOutdated('dev', 'abc123')).toBe(false);
  });
});
