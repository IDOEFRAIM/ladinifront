/**
 * Conversion UNIQUE des erreurs DB en réponses HTTP (pas de conversions ad hoc dans les routes).
 *   503 + Retry-After  indisponibilité temporaire (connexion, timeout, surcharge, verrou)
 *   409                conflit (unicité, FK, concurrence optimiste)
 *   422                intégrité (not null, check)
 *   404                introuvable
 *   500                erreur réelle non prévue — jamais masquée, message générique côté client
 * 401 / 403 restent décidés par la couche d'authentification, avant toute requête métier.
 */
import { NextResponse } from 'next/server';
import { classifyDbError, retryAfterSeconds } from '@/lib/db-errors';
import { asError } from '@/lib/errors';

export function dbErrorResponse(err: unknown, context: string): NextResponse {
  const info = classifyDbError(err);
  // Message technique : jamais renvoyé au client ; consigné sans URL ni identifiants.
  console.warn(JSON.stringify({ event: 'db_http_error', context, error_class: info.errorClass, error_code: info.code, status: info.status }));

  if (info.status === 503) {
    const retryAfter = retryAfterSeconds(info);
    return NextResponse.json(
      { success: false, data: null, error: 'Service momentanément indisponible, réessayez dans quelques secondes.', code: 'DB_UNAVAILABLE', retryAfter },
      { status: 503, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } }
    );
  }
  if (info.status === 409) {
    return NextResponse.json(
      { success: false, data: null, error: 'Conflit : la donnée a été modifiée. Rechargez puis recommencez.', code: 'CONFLICT' },
      { status: 409, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (info.status === 404) {
    return NextResponse.json({ success: false, data: null, error: 'Introuvable.', code: 'NOT_FOUND' }, { status: 404 });
  }
  if (info.status === 422) {
    return NextResponse.json({ success: false, data: null, error: 'Données invalides.', code: 'INTEGRITY' }, { status: 422 });
  }
  console.error(`[${context}] erreur non prévue:`, asError(err).message);
  return NextResponse.json({ success: false, data: null, error: 'Erreur serveur interne.', code: 'INTERNAL' }, { status: 500 });
}
