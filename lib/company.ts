// lib/company.ts — identité juridique de l'exploitant du site (source unique).
// La raison sociale doit apparaître EN TOUTES LETTRES sur le site (exigence de la vérification d'entreprise Meta).
// Les champs facultatifs (adresse, RCCM, IFU…) ne sont affichés que s'ils sont renseignés : on n'invente aucune mention légale.

export const COMPANY = {
  legalName: 'Ladini SARL',
  brand: 'LADINI',
  legalForm: 'Société à responsabilité limitée (SARL)',
  country: 'Burkina Faso',
  // Le numéro des statuts est en premier (celui que Meta compare au justificatif).
  phones: ['+226 57 11 47 80', '+226 01 47 98 00', '+226 68 81 52 99'],
  email: 'contact@ladini.tech',
  // RCCM / IFU / capital : à renseigner dans l'environnement, EXACTEMENT comme sur le justificatif officiel.
  // Siège social tel qu'écrit dans les statuts (surchargeable par variable d'environnement).
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Rimkièta, Secteur 19, Ouagadougou — 01 BP 2549 Ouagadougou 10010',
  rccm: process.env.NEXT_PUBLIC_COMPANY_RCCM || '',
  ifu: process.env.NEXT_PUBLIC_COMPANY_IFU || '',
  capital: process.env.NEXT_PUBLIC_COMPANY_CAPITAL || '',
} as const;

/** Lignes d'identification facultatives réellement renseignées. */
export function companyRegistrationLines(): string[] {
  const lines: string[] = [];
  if (COMPANY.rccm) lines.push(`RCCM : ${COMPANY.rccm}`);
  if (COMPANY.ifu) lines.push(`IFU : ${COMPANY.ifu}`);
  if (COMPANY.capital) lines.push(`Capital social : ${COMPANY.capital}`);
  return lines;
}
