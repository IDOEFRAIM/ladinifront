/** Indicatif Burkina Faso, pré-rempli dans les champs téléphone pour faciliter la saisie. */
export const BF_PREFIX = '+226 ';

/**
 * Normalise ce que tape l'utilisateur dans un champ téléphone :
 *  - l'indicatif « +226 » ne peut pas être effacé ;
 *  - un numéro collé ou tapé sans indicatif (« 70 00 00 00 », « 0022670000000 », « 070000000 ») est préfixé ;
 *  - un autre indicatif international explicite (« +33… ») est laissé tel quel.
 */
export function withBurkinaPrefix(raw: string): string {
  const v = (raw ?? '').replace(/[^\d+\s-]/g, '');
  if (v !== '' && '+226'.startsWith(v.trim())) return BF_PREFIX; // effacement partiel de l'indicatif
  if (v.startsWith('+226')) return v.length <= 4 ? BF_PREFIX : v.replace(/^\+226\s*/, BF_PREFIX);
  if (v.startsWith('+')) return v.length === 1 ? BF_PREFIX : v;
  if (v.startsWith('00226')) return BF_PREFIX + v.slice(5).trimStart();
  return v.trim() === '' ? BF_PREFIX : BF_PREFIX + v.replace(/^0(?=\d{8})/, '').trimStart();
}
