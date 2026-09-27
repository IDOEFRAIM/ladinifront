import { describe, expect, it } from 'vitest';
import { BF_PREFIX, withBurkinaPrefix } from '@/lib/phone-input';
import { RequiredPhoneSchema } from '@/lib/validators';

describe('withBurkinaPrefix', () => {
  it('garde l indicatif quand le champ est vidé', () => {
    expect(withBurkinaPrefix('')).toBe(BF_PREFIX);
    expect(withBurkinaPrefix('+22')).toBe(BF_PREFIX);
    expect(withBurkinaPrefix('+226')).toBe(BF_PREFIX);
  });

  it('préfixe un numéro saisi sans indicatif', () => {
    expect(withBurkinaPrefix('70 00 00 00')).toBe('+226 70 00 00 00');
    expect(withBurkinaPrefix('070000000')).toBe('+226 70000000');
    expect(withBurkinaPrefix('0022670000000')).toBe('+226 70000000');
  });

  it('ne double pas l indicatif et laisse un autre pays', () => {
    expect(withBurkinaPrefix('+226 70 00 00 00')).toBe('+226 70 00 00 00');
    expect(withBurkinaPrefix('+2267000')).toBe('+226 7000');
    expect(withBurkinaPrefix('+33612345678')).toBe('+33612345678');
  });

  it('produit un numéro accepté par la validation du formulaire', () => {
    expect(RequiredPhoneSchema.safeParse(withBurkinaPrefix('70 00 00 00')).success).toBe(true);
  });
});
