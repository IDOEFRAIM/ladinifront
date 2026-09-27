import { NextResponse } from 'next/server';
import { CLIENT_BUILD_ID, BUILD_HEADER } from '@/lib/client-version';

export const dynamic = 'force-dynamic';

/** Version du build en cours de service — interrogée par les clients pour détecter qu'ils tournent sur une ancienne version. */
export function GET() {
  return NextResponse.json({ buildId: CLIENT_BUILD_ID }, { headers: { 'Cache-Control': 'no-store', [BUILD_HEADER]: CLIENT_BUILD_ID } });
}
