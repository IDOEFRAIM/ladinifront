// app/api/chat/[role]/route.ts
// =========================================================
// WEBCHAT LADINI — Proxy serveur pour les sections buyer/producer
// Le X-Internal-Token ne quitte jamais ce fichier : le navigateur
// n'appelle que cette route interne, jamais api.ladini.tech.
// Le téléphone envoyé à Ladini est celui de la session authentifiée,
// jamais un champ texte fourni par le client.
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';
import { db } from '@/src/db';
import { users } from '@/src/db/schema';
import { sendLadiniWebchatMessage, LadiniChatError, type LadiniChatRole } from '@/lib/ladini-chat';

// L'agent peut enchaîner plusieurs appels LLM/outils avant de répondre.
export const maxDuration = 60;

const VALID_ROLES: LadiniChatRole[] = ['producer', 'buyer'];

export async function POST(req: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!VALID_ROLES.includes(role as LadiniChatRole)) {
    return NextResponse.json({ error: 'Section de chat inconnue.' }, { status: 404 });
  }

  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    return error ?? NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 422 });
  }

  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message !== 'string' || message.trim().length === 0 || message.length > 4000) {
    return NextResponse.json({ error: 'Message invalide (1 à 4000 caractères requis).' }, { status: 422 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
    columns: { phone: true },
  });

  if (!user?.phone) {
    return NextResponse.json(
      { error: 'Aucun numéro de téléphone vérifié sur ce compte.' },
      { status: 422 }
    );
  }

  try {
    const result = await sendLadiniWebchatMessage(role as LadiniChatRole, user.phone, message.trim());
    return NextResponse.json({ reply: result.reply, interactive: result.interactive });
  } catch (err) {
    if (err instanceof LadiniChatError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[api/chat] Erreur inattendue:', err);
    return NextResponse.json({ error: 'Erreur serveur interne.' }, { status: 500 });
  }
}
