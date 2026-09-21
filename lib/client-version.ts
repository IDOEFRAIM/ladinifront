/**
 * Version du build servie au navigateur. Injectée à la compilation (next.config.ts → NEXT_PUBLIC_BUILD_ID) : un onglet resté ouvert
 * sur une ancienne version connaît donc SA version et peut la comparer à celle que le serveur annonce.
 */
export const CLIENT_BUILD_ID: string = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
export const BUILD_HEADER = 'x-app-build';

const UNKNOWN = new Set(['', 'dev', 'unknown']);

/** Vrai si le serveur annonce une version différente de celle du client. Une version inconnue (dev, entête absent) n'est jamais « périmée ». */
export function isOutdated(clientBuild: string, serverBuild: string | null | undefined): boolean {
  if (!serverBuild || UNKNOWN.has(serverBuild) || UNKNOWN.has(clientBuild)) return false;
  return clientBuild !== serverBuild;
}
