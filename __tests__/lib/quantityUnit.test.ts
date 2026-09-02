import { describe, it, expect } from 'vitest';
import { convertQuantity, normalizeUnit } from '@/lib/quantityUnit';

describe('convertQuantity', () => {
  it('returns the same value when units already match', () => {
    expect(convertQuantity(10, 'KG', 'KG')).toBe(10);
  });

  it('converts KG <-> TONNE using a fixed universal factor', () => {
    expect(convertQuantity(1000, 'KG', 'TONNE')).toBe(1);
    expect(convertQuantity(1, 'TONNE', 'KG')).toBe(1000);
  });

  it('is case-insensitive on unit tokens', () => {
    expect(convertQuantity(1000, 'kg', 'tonne')).toBe(1);
  });

  it('never guesses a conversion for units without a universal factor', () => {
    expect(convertQuantity(3, 'BAG', 'KG')).toBeNull();
    expect(convertQuantity(3, 'KG', 'LITRE')).toBeNull();
  });

  it('returns null for empty/missing units', () => {
    expect(convertQuantity(3, '', 'KG')).toBeNull();
    expect(convertQuantity(3, 'KG', null)).toBeNull();
  });
});

describe('normalizeUnit', () => {
  it('uppercases and trims', () => {
    expect(normalizeUnit('  kg ')).toBe('KG');
  });

  it('handles null/undefined as empty string', () => {
    expect(normalizeUnit(null)).toBe('');
    expect(normalizeUnit(undefined)).toBe('');
  });
});
