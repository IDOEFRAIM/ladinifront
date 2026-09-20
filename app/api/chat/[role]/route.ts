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
import { sendLadiniWebchatMessage, LadiniChatError, type LadiniChatRole, type LadiniChatImage } from '@/features/chat/services/ladini-chat.service';

// L'agent peut enchaîner plusieurs appels LLM/outils avant de répondre.
export const maxDuration = 60;

const ALLOWED_MIMES: string[] = ['image/jpeg', 'image/png', 'image/webp'];
// Le backend accepte 8 Mo décodés ; base64 = 4/3 de la taille binaire.
const MAX_IMAGE_BASE64_CHARS = Math.ceil((8 * 1024 * 1024 * 4) / 3);

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

  const { message: rawMessage, image_base64, image_mime } = (body ?? {}) as {
    message?: unknown; image_base64?: unknown; image_mime?: unknown;
  };
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';
  if (message.length > 4000) {
    return NextResponse.json({ error: 'Message trop long (4000 caractères max).' }, { status: 422 });
  }

  let image: LadiniChatImage | undefined;
  if (image_base64 !== undefined || image_mime !== undefined) {
    if (
      typeof image_base64 !== 'string' ||
      !ALLOWED_MIMES.includes(image_mime as string) ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(image_base64) // refuse aussi le préfixe "data:image/...;base64,"
    ) {
      return NextResponse.json({ error: 'Image invalide (JPEG, PNG ou WebP uniquement).' }, { status: 422 });
    }
    if (image_base64.length > MAX_IMAGE_BASE64_CHARS) {
      return NextResponse.json({ error: 'Image trop volumineuse.' }, { status: 413 });
    }
    image = { base64: image_base64, mime: image_mime as LadiniChatImage['mime'] };
  }

  if (!message && !image) {
    return NextResponse.json({ error: 'Message invalide (un texte ou une image est requis).' }, { status: 422 });
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
    const result = await sendLadiniWebchatMessage(role as LadiniChatRole, user.phone, message, image);
    return NextResponse.json({ reply: result.reply, interactive: result.interactive });
  } catch (err) {
    if (err instanceof LadiniChatError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[api/chat] Erreur inattendue:', err);
    return NextResponse.json({ error: 'Erreur serveur interne.' }, { status: 500 });
  }
}
