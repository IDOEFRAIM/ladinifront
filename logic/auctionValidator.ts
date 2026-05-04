/**
 * Logique de validation des enchères (surenchère).
 *
 * Utilisation côté client ET côté serveur.
 */

export interface BidValidationResult {
  valid: boolean;
  error?: string;
  minimumBid?: number;
}

/**
 * Valide qu'une enchère respecte les règles de surenchère.
 *
 * @param currentBestPrice - Le meilleur prix actuel (plus bas pour reverse auction)
 * @param newBid - Le prix proposé
 * @param increment - Incrément minimum entre enchères (en FCFA)
 * @param maxPrice - Plafond de prix (maxPricePerUnit)
 * @param isReverseAuction - true si l'enchère est inversée (prix le plus bas gagne, défaut dans AgriConnect)
 */
export function validateBid(
  currentBestPrice: number | null,
  newBid: number,
  increment: number = 50,
  maxPrice: number | null = null,
  isReverseAuction: boolean = true,
): BidValidationResult {
  // Price must be positive
  if (newBid <= 0) {
    return { valid: false, error: 'Le prix doit être supérieur à 0 FCFA' };
  }

  // Max price ceiling
  if (maxPrice !== null && newBid > maxPrice) {
    return { valid: false, error: `Le prix ne peut dépasser le plafond de ${maxPrice} FCFA` };
  }

  // If there is a current best price, enforce minimum increment
  if (currentBestPrice !== null) {
    if (isReverseAuction) {
      // Reverse: new bid must be LOWER by at least the increment
      const maxAllowed = currentBestPrice - increment;
      if (newBid > maxAllowed) {
        return {
          valid: false,
          error: `L'enchère doit être d'au plus ${maxAllowed} FCFA (${increment} FCFA de moins que l'offre actuelle)`,
          minimumBid: maxAllowed,
        };
      }
    } else {
      // Standard: new bid must be HIGHER by at least the increment
      const minRequired = currentBestPrice + increment;
      if (newBid < minRequired) {
        return {
          valid: false,
          error: `L'enchère doit être d'au moins ${minRequired} FCFA`,
          minimumBid: minRequired,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Calcule le prochain montant minimum/maximum autorisé.
 */
export function getNextBidAmount(
  currentBestPrice: number | null,
  increment: number = 50,
  maxPrice: number | null = null,
  isReverseAuction: boolean = true,
): number | null {
  if (currentBestPrice === null) {
    return maxPrice; // First bid can be at max
  }
  if (isReverseAuction) {
    return Math.max(0, currentBestPrice - increment);
  }
  return currentBestPrice + increment;
}
