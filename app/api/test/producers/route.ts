import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not allowed in production' }, { status: 403 });
  }

  try {
    const { fetchProducersForTest } = await import('@/app/actions/test.server');
    const producers = await fetchProducersForTest();

    return NextResponse.json({ success: true, producers });
  } catch (err) {
    console.error('[api/test/producers] GET error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
