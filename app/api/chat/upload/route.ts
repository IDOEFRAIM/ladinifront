// app/api/chat/upload/route.ts
// =========================================================
// Upload d'image pour le webchat Ladini.
// L'API /api/webchat/{role} n'accepte que du texte libre (voir lib/ladini-chat.ts) :
// on héberge donc l'image sur notre propre stockage (Supabase) et on transmet
// son URL publique dans le message texte envoyé à Ladini.
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { uploadBufferToSupabase } from '@/lib/supabase.server';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

export async function POST(req: NextRequest) {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    return error ?? NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 422 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 422 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Seules les images sont acceptées.' }, { status: 422 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Image trop volumineuse (5 Mo max).' }, { status: 422 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const remotePath = `chat/${ctx.userId}/${Date.now()}_${safeName}`;
    const url = await uploadBufferToSupabase(remotePath, buffer, file.type);
    if (!url) throw new Error('URL publique manquante après upload.');
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[api/chat/upload] Échec upload:', err);
    return NextResponse.json({ error: "Échec de l'envoi de l'image. Réessayez." }, { status: 502 });
  }
}
