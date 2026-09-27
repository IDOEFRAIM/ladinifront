import type { NextRequest } from 'next/server';
import { adminEndpoint } from '@/features/monitoring/cockpit/http';
import { fetchDiagnostics } from '@/features/monitoring/cockpit/diagnostics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(req: NextRequest) {
  return adminEndpoint(req, () => fetchDiagnostics());
}
