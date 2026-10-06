import { describe, expect, it } from 'vitest';
import { describeFrequency, fmtAgo, fmtDay, fmtDays, fmtQty } from '@/features/recurring/ui/format';

describe('format recurring', () => {
  it('fmtDay : ISO -> jour en toutes lettres, sans décalage de fuseau', () => {
    expect(fmtDay('2026-10-09')).toBe('9 octobre 2026');
    expect(fmtDay('2026-10-09T00:00:00')).toBe('9 octobre 2026');
    expect(fmtDay('2027-01-03')).toBe('3 janvier 2027');
    expect(fmtDay(null)).toBe('—');
  });
  it('fmtDays : pluriel', () => {
    expect(fmtDays(0)).toBe('0 jour');
    expect(fmtDays(1)).toBe('1 jour');
    expect(fmtDays(4)).toBe('4 jours');
  });
  it('fmtQty', () => {
    expect(fmtQty(3, 'TETE')).toBe('3 TETE');
    expect(fmtQty(2.5, 'KG')).toBe('2.5 KG');
    expect(fmtQty(null)).toBe('—');
  });
  it('describeFrequency', () => {
    expect(describeFrequency('WEEKLY')).toBe('Chaque semaine');
    expect(describeFrequency('WEEKLY_DAYS', [1, 5])).toBe('Certains jours (lundi, vendredi)');
  });
  it('fmtAgo', () => {
    const now = new Date('2026-10-06T12:00:00Z').getTime();
    expect(fmtAgo('2026-10-06T11:30:00Z', now)).toBe('il y a 30 min');
    expect(fmtAgo(null, now)).toBe('—');
  });
});
