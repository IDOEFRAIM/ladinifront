import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { fetchUsersForTest } = await import('@/app/actions/test.server');
    const users = await fetchUsersForTest();

    return NextResponse.json({ success: true, users });
  } catch (err) {
    console.error('[api/test] GET users error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
