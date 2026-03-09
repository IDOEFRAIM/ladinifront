import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // Dev-only safety
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not allowed in production' }, { status: 403 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('id') || 'fa987f63-fafa-4147-9676-52c9af0edc75';

  try {
    const { checkUserInDb } = await import('@/app/actions/debug.server');
    const { user, dbInfo } = await checkUserInDb(userId || undefined);

    return NextResponse.json({ success: true, userFound: !!user, user, dbInfo });
  } catch (err) {
    console.error('[api/debug/db] error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
