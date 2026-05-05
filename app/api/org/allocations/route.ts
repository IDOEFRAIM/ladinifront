/**
 * /api/org/allocations — Thin REST wrapper around org-manager service.
 * Auth + business logic is handled by the service layer.
 */
import { NextResponse } from 'next/server';
import {
  createOrgAllocation,
  deleteOrgAllocation,
  updateOrgAllocation,
  getOrgAllocations,
} from '@/services/org-manager.service';

export async function GET() {
  const result = await getOrgAllocations();
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, data: result.data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const result = await createOrgAllocation(body);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, allocation: result.data });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const { id } = body || {};
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  const result = await deleteOrgAllocation(id);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { id, ...data } = body || {};
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  const result = await updateOrgAllocation(id, data);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, allocation: result.data });
}
