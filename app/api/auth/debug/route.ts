import { NextResponse } from 'next/server';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const sessionTokenPresent = cookieHeader.includes(COOKIE_NAMES.SESSION_TOKEN);

  return NextResponse.json({
    hasCookieHeader: !!cookieHeader,
    rawLength: cookieHeader.length,
    sessionTokenPresent,
    tokenPreview: sessionTokenPresent ? 'Présent (masqué)' : 'Absent',
    userAgent: req.headers.get('user-agent') || null,
    timestamp: new Date().toISOString(),
  });
}
