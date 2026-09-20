export type Farm = { id: string; name: string; location: string | null };

export const UNIT_OPTIONS = ['KG', 'TONNE', 'SAC', 'UNITE', 'TETE'] as const;

export const PRODUCTION_TYPES = [
  { value: 'CROP', label: 'Culture' },
  { value: 'LIVESTOCK', label: 'Élevage' },
] as const;

// (2026-09-02) `crop_cycles` -> `market_offers` (schéma dégraissé) : les
// champs de suivi agronomique détaillé (superficie, date de semis, stock
// initial séparé, date d'éclosion, variété, stade de croissance) n'existent
// plus côté base — ce formulaire ne collecte donc plus que ce que
// `marketOffers` sait réellement stocker.
export const emptyForm = {
  farmId: '',
  productLabel: '',
  productionType: 'CROP',
  expectedHarvestDate: '',
  estimatedAvailableAt: '',
  availableQuantity: '',
  pricePerUnit: '',
  unit: 'KG',
  isPublic: true,
  preorderEnabled: true,
  species: '',
  breed: '',
  currentStock: '',
};
