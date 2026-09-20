// app/actions/agri.server.ts
import { audit } from '@/lib/audit';
import { getSessionFromRequest } from '@/lib/session';

export async function traceAction(payload: { territoryId: string; action: string; meta?: any }, actorId?: string) {
  try {
    const entry = {
      actorId: actorId || (payload as any).actorId || 'anonymous',
      action: `AGRI:${payload.action}`,
      entityId: payload.territoryId || 'unknown',
      entityType: 'AGRI_TRACE',
      oldValue: null,
      newValue: payload.meta || null,
      ipAddress: undefined,
    };

    // Use audit append-only writer (fire-and-forget)
    await audit(entry as any);

    return { success: true };
  } catch (err) {
    console.error('[agri.server] traceAction error', err);
    return { success: false, error: String(err) };
  }
}
