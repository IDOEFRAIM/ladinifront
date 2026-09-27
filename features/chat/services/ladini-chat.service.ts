// lib/ladini-chat.ts
// =========================================================
// Client serveur pour le webchat Ladini (partagé avec WhatsApp).
// N'est JAMAIS appelé depuis le navigateur : X-Internal-Token
// ne doit exister que côté serveur (process.env, jamais NEXT_PUBLIC_*).
// =========================================================

export type LadiniChatRole = 'producer' | 'buyer';

export interface LadiniChatReply {
  reply: string;
  interactive: { kind: string; [key: string]: unknown } | null;
  workspace_id: string;
}

export class LadiniChatError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'LadiniChatError';
    this.status = status;
  }
}

const LADINI_API_BASE = 'https://api.ladini.tech';
// L'agent peut enchaîner plusieurs appels LLM/outils avant de répondre (jusqu'à ~45s) ;
// on laisse une marge avant la limite de 60s côté route.
const REQUEST_TIMEOUT_MS = 58_000;

// Les numéros stockés en base ne portent pas toujours l'indicatif (voir RequiredPhoneSchema) :
// on normalise vers le format international attendu par Ladini.
function normalizePhoneForLadini(phone: string): string {
  const trimmed = phone.replace(/[\s-]/g, '');
  return trimmed.startsWith('+') ? trimmed : `+226${trimmed}`;
}

export interface LadiniChatImage {
  /** Base64 brut, SANS préfixe `data:image/...;base64,` */
  base64: string;
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
}

async function postWebchat(
  role: LadiniChatRole,
  token: string,
  phone: string,
  message: string,
  image?: LadiniChatImage
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${LADINI_API_BASE}/api/webchat/${role}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': token,
      },
      body: JSON.stringify({
        message,
        phone_number: normalizePhoneForLadini(phone),
        ...(image ? { image_base64: image.base64, image_mime: image.mime } : {}),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendLadiniWebchatMessage(
  role: LadiniChatRole,
  phone: string,
  message: string,
  image?: LadiniChatImage
): Promise<LadiniChatReply> {
  const token = process.env.LADINI_INTERNAL_TOKEN;
  if (!token) {
    console.error('[ladini-chat] LADINI_INTERNAL_TOKEN absent — configuration serveur manquante.');
    throw new LadiniChatError(503, 'Service de chat momentanément indisponible.');
  }

  let res: Response;
  try {
    res = await postWebchat(role, token, phone, message, image);
  } catch {
    // Erreur réseau/timeout : un seul réessai avant d'abandonner.
    try {
      res = await postWebchat(role, token, phone, message, image);
    } catch {
      throw new LadiniChatError(502, "L'assistant est momentanément injoignable. Réessayez dans un instant.");
    }
  }

  if (res.status === 500) {
    // Erreur inattendue : un réessai avant de renvoyer une erreur générique.
    try {
      const retry = await postWebchat(role, token, phone, message, image);
      if (retry.ok) res = retry;
    } catch {
      // on garde la réponse 500 initiale, gérée ci-dessous
    }
  }

  if (res.status === 401) {
    console.error('[ladini-chat] 401 de Ladini — X-Internal-Token invalide/absent côté serveur. Alerte config.');
    throw new LadiniChatError(502, "L'assistant est momentanément indisponible.");
  }
  if (res.status === 413) {
    throw new LadiniChatError(413, 'Image trop volumineuse.');
  }
  if (res.status === 422) {
    throw new LadiniChatError(400, image ? "Image refusée par l'assistant (format ou taille invalide)." : 'Message invalide.');
  }
  if (res.status === 503) {
    throw new LadiniChatError(503, 'Service momentanément indisponible.');
  }
  if (!res.ok) {
    throw new LadiniChatError(502, 'Une erreur est survenue. Merci de réessayer.');
  }

  const data = await res.json();
  return {
    reply: typeof data.reply === 'string' ? data.reply : '',
    interactive: data.interactive ?? null,
    workspace_id: typeof data.workspace_id === 'string' ? data.workspace_id : '',
  };
}
