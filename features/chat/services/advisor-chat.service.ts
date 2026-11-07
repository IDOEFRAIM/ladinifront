// =========================================================
// Client serveur pour l'agent conseil (« Advisor »), canal web.
// JAMAIS appelé depuis le navigateur : ADVISOR_WEB_TOKEN ne doit exister que
// côté serveur (process.env, jamais NEXT_PUBLIC_*, jamais dans un dépôt).
// Contrat : docs/advisor/INTEGRATION_SITE.md (dépôt Advisor).
//
// Règles du contrat appliquées ici :
//  - AUCUN réessai automatique d'un POST (pas de déduplication côté Advisor : le tour a pu être traité) ;
//  - délai d'attente ~80 s (agent ~40 s puis moteur de secours ~30 s) ;
//  - `text` est renvoyé tel quel, sans reformulation.
// =========================================================

export const ADVISOR_TIMEOUT_MS = 80_000;
export const ADVISOR_MAX_TEXT_CHARS = 2000;

export interface AdvisorReply {
  text: string;
  /** ANSWERED, NEEDS_INFO, CLARIFY, PARTIAL, NO_VALIDATED_DATA, ESCALATE, REFUSED, UNAVAILABLE ou CHAT. */
  status: string;
  followup_offers: string[];
}

export class AdvisorChatError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AdvisorChatError';
    this.status = status;
  }
}

/** Indicateur de fonctionnalité, DÉSACTIVÉ par défaut. Booléen public (pas un secret). */
export function isAdvisorChatEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADVISOR_CHAT_ENABLED === 'true';
}

export interface AdvisorChatInput {
  /** Identifiant de l'utilisateur AUTHENTIFIÉ (session), jamais une valeur venue du corps de la requête. */
  userId: string;
  text: string;
  latitude?: number;
  longitude?: number;
}

export async function sendAdvisorMessage(input: AdvisorChatInput): Promise<AdvisorReply> {
  // Jeton interne partagé (le même que pour market/analytics) ; ADVISOR_WEB_TOKEN reste prioritaire s'il est défini.
  const token = process.env.ADVISOR_WEB_TOKEN || process.env.INTERNAL_API_TOKEN;
  const baseUrl = (process.env.ADVISOR_BASE_URL ?? '').trim().replace(/\/+$/, '');
  if (!token || !baseUrl) {
    console.error('[advisor-chat] jeton (ADVISOR_WEB_TOKEN / INTERNAL_API_TOKEN) ou ADVISOR_BASE_URL absent — configuration serveur manquante.');
    throw new AdvisorChatError(503, 'Le conseiller est momentanément indisponible. Réessayez.');
  }

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    request_id: crypto.randomUUID(), // unique pour CE message
    text: input.text,
  };
  if (input.latitude !== undefined && input.longitude !== undefined) {
    payload.latitude = input.latitude;
    payload.longitude = input.longitude;
  }

  let res: Response;
  try {
    // Un seul POST, jamais de réessai : voir l'en-tête du fichier.
    res = await fetch(`${baseUrl}/advisor/web/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(ADVISOR_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    if (timedOut) {
      throw new AdvisorChatError(
        504,
        'Le conseiller met trop de temps à répondre. Votre message a peut-être été reçu : vérifiez avant de le renvoyer.'
      );
    }
    throw new AdvisorChatError(502, 'Le conseiller est injoignable. Réessayez dans un instant.');
  }

  if (res.status === 503) {
    throw new AdvisorChatError(503, 'Le conseiller est momentanément indisponible. Réessayez.');
  }
  if (res.status === 401 || res.status === 404) {
    // Jeton faux/absent (401) ou canal non monté (404) : problème de configuration, pas de l'utilisateur.
    console.error(`[advisor-chat] ${res.status} de l'Advisor — jeton ou canal web mal configuré. Alerte config.`);
    throw new AdvisorChatError(502, 'Le conseiller est momentanément indisponible.');
  }
  if (!res.ok) {
    console.error(`[advisor-chat] statut inattendu de l'Advisor : ${res.status}`);
    throw new AdvisorChatError(502, 'Une erreur est survenue. Merci de réessayer.');
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new AdvisorChatError(502, 'Une erreur est survenue. Merci de réessayer.');
  }
  const d = (data ?? {}) as { text?: unknown; status?: unknown; followup_offers?: unknown };
  if (typeof d.text !== 'string' || !d.text.trim()) {
    throw new AdvisorChatError(502, 'Une erreur est survenue. Merci de réessayer.');
  }
  return {
    text: d.text, // affiché tel quel
    status: typeof d.status === 'string' ? d.status : '',
    followup_offers: Array.isArray(d.followup_offers)
      ? d.followup_offers.filter((o): o is string => typeof o === 'string')
      : [],
  };
}
