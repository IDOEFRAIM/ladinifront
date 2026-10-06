/**
 * Décimal à virgule fixe EXACT (BigInt) — aucun `number` flottant n'entre dans un calcul d'argent.
 *
 * Même politique que le backend (`domain/commercial_pricing_snapshot.py`) :
 *   - montant commercial : 2 décimales ; prix normalisé (dérivé) : 4 décimales ;
 *   - arrondi ROUND_HALF_UP (loin de zéro sur les demi), jamais l'arrondi bancaire ni celui d'un flottant.
 *
 * Volontairement minimal (pas de dépendance) : parse, multiplication exacte, division arrondie, comparaison,
 * formatage. La PARITÉ avec Python est verrouillée par `__tests__/auction/pricing-parity.test.ts`.
 */

export class DecimalError extends Error {}

const TEN = BigInt(10);
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);

const pow10 = (n: number): bigint => TEN ** BigInt(n);

export class Dec {
  /** valeur = n / 10^s */
  readonly n: bigint;
  readonly s: number;

  constructor(n: bigint, s: number) {
    if (s < 0) throw new DecimalError('échelle négative');
    this.n = n;
    this.s = s;
  }

  static parse(value: string | number | bigint | Dec): Dec {
    if (value instanceof Dec) return value;
    if (typeof value === 'bigint') return new Dec(value, 0);
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new DecimalError(`nombre non fini: ${value}`);
      value = String(value);
    }
    const text = String(value).trim().replace(',', '.');
    // notation scientifique (« 1e21 ») refusée : ce n'est pas le nombre que l'utilisateur a dit
    const m = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text);
    if (!m) throw new DecimalError(`nombre invalide: ${JSON.stringify(value)}`);
    const frac = m[3] ?? '';
    const n = BigInt(m[2] + frac);
    return new Dec(m[1] === '-' ? -n : n, frac.length);
  }

  get isZero(): boolean { return this.n === ZERO; }
  get isPositive(): boolean { return this.n > ZERO; }
  get isInteger(): boolean { return this.n % pow10(this.s) === ZERO; }

  mul(o: Dec): Dec { return new Dec(this.n * o.n, this.s + o.s); }

  /** this / o arrondi HALF_UP (loin de zéro) à `scale` décimales. */
  div(o: Dec, scale: number): Dec {
    if (o.n === ZERO) throw new DecimalError('division par zéro');
    const num = this.n * pow10(o.s + scale);
    const den = o.n * pow10(this.s);
    return new Dec(roundDiv(num, den), scale);
  }

  /** Arrondi HALF_UP (loin de zéro) à `scale` décimales. */
  quantize(scale: number): Dec {
    if (scale >= this.s) return new Dec(this.n * pow10(scale - this.s), scale);
    return new Dec(roundDiv(this.n, pow10(this.s - scale)), scale);
  }

  cmp(o: Dec): number {
    const s = Math.max(this.s, o.s);
    const a = this.n * pow10(s - this.s);
    const b = o.n * pow10(s - o.s);
    return a === b ? 0 : a < b ? -1 : 1;
  }

  eq(o: Dec): boolean { return this.cmp(o) === 0; }

  /** Chaîne décimale conservant l'échelle (« 4500000.00 ») — équivalent de `format(Decimal, "f")`. */
  toFixed(): string { return render(this.n, this.s); }

  /** Chaîne décimale sans zéros superflus (« 4500000 ») — équivalent de `format(d.normalize(), "f")`. */
  toPlain(): string {
    let { n, s } = this;
    while (s > 0 && n % TEN === ZERO) { n /= TEN; s -= 1; }
    if (n === ZERO) return '0';
    return render(n, s);
  }
}

/** Quotient entier arrondi HALF_UP loin de zéro. */
function roundDiv(num: bigint, den: bigint): bigint {
  const neg = (num < ZERO) !== (den < ZERO);
  const a = num < ZERO ? -num : num;
  const b = den < ZERO ? -den : den;
  const q = (TWO * a + b) / (TWO * b);
  return neg ? -q : q;
}

function render(n: bigint, s: number): string {
  const neg = n < ZERO;
  const digits = (neg ? -n : n).toString().padStart(s + 1, '0');
  const int = digits.slice(0, digits.length - s);
  const frac = s > 0 ? digits.slice(digits.length - s) : '';
  return `${neg ? '-' : ''}${int}${frac ? `.${frac}` : ''}`;
}

export const D = (v: string | number | bigint | Dec): Dec => Dec.parse(v);
export const D_ONE = new Dec(ONE, 0);
