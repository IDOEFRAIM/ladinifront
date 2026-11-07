// app/api/conseil/route.ts
// =========================================================
// CONSEIL (Advisor) — Proxy serveur du canal web de l'agent conseil.
// Derrière un indicateur de fonctionnalité (désactivé par défaut) : 404 tant qu'il est éteint.
// Ordre imposé : indicateur → AUTHENTIFICATION (401) → limite de débit → validation → appel.
// `user_id` vient UNIQUEMENT de la session ; aucun identifiant du corps n'est lu.
// Le jeton ADVISOR_WEB_TOKEN ne quitte jamais le serveur (voir advisor-chat.service.ts).
// /api/chat/[role] (ancien webchat) reste intact, en repli.
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  AdvisorChatError,
  ADVISOR_MAX_TEXT_CHARS,
  isAdvisorChatEnabled,
  sendAdvisorMessage,
} from '@/features/chat/services/advisor-chat.service';

// Un tour peut durer ~40 s (agent) + ~30 s (secours) ; l'appel sortant coupe à 80 s.
export const maxDuration = 90;

// Par utilisateur, en mémoire (par instance) : l'Advisor ne limite pas le débit.
const RATE = { limit: 6, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  if (!isAdvisorChatEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    return error ?? NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const rl = checkRateLimit(`conseil:${ctx.userId}`, RATE);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de messages. Patientez un instant avant de renvoyer.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 422 });
  }

  // Seuls `message` et (facultatif) latitude/longitude sont lus. Tout `user_id` du corps est ignoré.
  const { message: rawMessage, latitude, longitude } = (body ?? {}) as {
    message?: unknown; latitude?: unknown; longitude?: unknown;
  };
  const text = typeof rawMessage === 'string' ? rawMessage.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Message invalide (un texte est requis).' }, { status: 422 });
  }
  if (text.length > ADVISOR_MAX_TEXT_CHARS) {
    return NextResponse.json({ error: `Message trop long (${ADVISOR_MAX_TEXT_CHARS} caractères max).` }, { status: 422 });
  }

  let coords: { latitude: number; longitude: number } | undefined;
  if (latitude !== undefined || longitude !== undefined) {
    if (
      typeof latitude !== 'number' || typeof longitude !== 'number' ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    ) {
      return NextResponse.json({ error: 'Position invalide.' }, { status: 422 });
    }
    coords = { latitude, longitude };
  }

  try {
    const reply = await sendAdvisorMessage({ userId: ctx.userId, text, ...coords });
    return NextResponse.json({
      text: reply.text,
      status: reply.status,
      followup_offers: reply.followup_offers,
    });
  } catch (err) {
    if (err instanceof AdvisorChatError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[api/conseil] Erreur inattendue:', err);
    return NextResponse.json({ error: 'Erreur serveur interne.' }, { status: 500 });
  }
}
