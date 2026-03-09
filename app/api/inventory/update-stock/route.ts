import { getSessionFromRequest } from '@/lib/session';
import { requireOrgAction, requireMembershipAndPermission } from '@/lib/api-guard';
import { updateStockAction } from '@/app/actions/inventory.server';

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req as any);
  if (!session?.userId) return new Response('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { organizationId, stockId, newQuantity, zoneId } = body;
  if (!organizationId || !stockId || typeof newQuantity !== 'number') return new Response('Bad Request', { status: 400 });

  // 1. Verify membership, jurisdiction and required permission (double-check)
  const { membership, error: permError } = await requireMembershipAndPermission(req as any, organizationId, ['STOCK_EDIT']);
  if (permError) return permError;
  // Also ensure territorial jurisdiction (if zoneId supplied)
  const { error: zoneError } = await requireOrgAction(req as any, organizationId, zoneId);
  if (zoneError) return zoneError;

  // 2. Perform the update via server action which handles transaction and audit
  const result = await updateStockAction(session.userId, stockId, newQuantity);

  return new Response(JSON.stringify({ success: true, stock: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
