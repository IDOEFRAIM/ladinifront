/**
 * /api/inventory/distribute — Thin REST wrapper around org-manager service.
 * Auth + business logic is handled by createOrgDistribution in the service layer.
 */
import { NextResponse } from 'next/server';
import { createOrgDistribution } from '@/services/org-manager.service';

export async function POST(req: Request) {
  const body = await req.json();
  const { allocationId, producerId, assignedTo, quantity, cnibProvided, channel } = body;

  if (!allocationId || !producerId || !quantity) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const result = await createOrgDistribution({
    allocationId,
    producerId,
    quantity: Number(quantity),
    assignedTo: assignedTo || null,
    cnibProvided: cnibProvided || null,
    channel: channel || 'IN_APP',
  });

  if (!result.success) {
    const msg = result.error || 'server_error';
    const status = msg.includes('introuvable') ? 404
      : msg.includes('stock') ? 409
      : msg.includes('zone') || msg.includes('refus') ? 403
      : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ ok: true, distributionId: (result.data as any)?.distributionId });
}
