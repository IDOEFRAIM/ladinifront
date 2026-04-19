import { NextResponse } from 'next/server';
import { db, schema } from '@/src/db';
import { getSessionFromRequest } from '@/lib/session';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request) {
  const body = await req.json();
  const { seedType, totalQuantity, unit, zoneId } = body;
  if (!seedType || !totalQuantity) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  const session = await getSessionFromRequest(req as any);
  if (!session || !session.userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const orgId = session.activeOrgId;
  if (!orgId) return NextResponse.json({ error: 'no_active_org' }, { status: 400 });

  // ensure caller is org ADMIN (or system admin)
  try {
    const userRows = await db.select({ id: schema.users.id, role: schema.users.role }).from(schema.users).where(eq(schema.users.id, session.userId)).limit(1);
    const user = userRows?.[0];
    const sysRole = String(user?.role || '').toUpperCase();
    if (sysRole !== 'SUPERADMIN' && sysRole !== 'ADMIN') {
      const membershipRows = await db.select({ role: schema.userOrganizations.role }).from(schema.userOrganizations).where(and(eq(schema.userOrganizations.userId, session.userId), eq(schema.userOrganizations.organizationId, orgId))).limit(1);
      const mem = membershipRows?.[0];
      if (!mem || String(mem.role) !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  } catch (e) {
    console.error('allocations POST auth error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  try {
    const now = new Date();
    const values = {
      organizationId: orgId,
      zoneId: zoneId ?? null,
      seedType,
      totalQuantity: Number(totalQuantity),
      remainingQuantity: Number(totalQuantity),
      unit: unit ?? 'KG',
      allocatedById: session.userId,
      createdAt: now,
      updatedAt: now,
    };
    const [created] = await db.insert(schema.seedAllocations).values(values).returning();
    return NextResponse.json({ ok: true, allocation: created ? { id: created.id } : null });
  } catch (e) {
    console.error('failed creating allocation', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session || !session.userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const orgId = session.activeOrgId;
    if (!orgId) return NextResponse.json({ error: 'no_active_org' }, { status: 400 });

    const body = await req.json();
    const { id } = body || {};
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    // ensure caller is org ADMIN (or system admin) - reuse POST auth rules
    try {
      const userRows = await db.select({ id: schema.users.id, role: schema.users.role }).from(schema.users).where(eq(schema.users.id, session.userId)).limit(1);
      const user = userRows?.[0];
      const sysRole = String(user?.role || '').toUpperCase();
      if (sysRole !== 'SUPERADMIN' && sysRole !== 'ADMIN') {
        const membershipRows = await db.select({ role: schema.userOrganizations.role }).from(schema.userOrganizations).where(and(eq(schema.userOrganizations.userId, session.userId), eq(schema.userOrganizations.organizationId, orgId))).limit(1);
        const mem = membershipRows?.[0];
        if (!mem || String(mem.role) !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } catch (e) {
      console.error('allocations DELETE auth error', e);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }

    // prevent delete if distributions exist for this allocation
    const distro = await db.select().from(schema.seedDistributions).where(eq(schema.seedDistributions.allocationId, id)).limit(1);
    if (distro?.length) return NextResponse.json({ error: 'has_distributions' }, { status: 400 });

    const [, deleted] = await db.delete(schema.seedAllocations).where(eq(schema.seedAllocations.id, id)).returning();
    return NextResponse.json({ ok: true, deleted: deleted ?? null });
  } catch (e) {
    console.error('allocations DELETE error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session || !session.userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const orgId = session.activeOrgId;
    if (!orgId) return NextResponse.json({ error: 'no_active_org' }, { status: 400 });

    const body = await req.json();
    const { id, seedType, totalQuantity, unit, zoneId } = body || {};
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

    // auth: admin only (same as POST)
    try {
      const userRows = await db.select({ id: schema.users.id, role: schema.users.role }).from(schema.users).where(eq(schema.users.id, session.userId)).limit(1);
      const user = userRows?.[0];
      const sysRole = String(user?.role || '').toUpperCase();
      if (sysRole !== 'SUPERADMIN' && sysRole !== 'ADMIN') {
        const membershipRows = await db.select({ role: schema.userOrganizations.role }).from(schema.userOrganizations).where(and(eq(schema.userOrganizations.userId, session.userId), eq(schema.userOrganizations.organizationId, orgId))).limit(1);
        const mem = membershipRows?.[0];
        if (!mem || String(mem.role) !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
    } catch (e) {
      console.error('allocations PATCH auth error', e);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }

    // fetch allocation
    const rows = await db.select().from(schema.seedAllocations).where(eq(schema.seedAllocations.id, id)).limit(1);
    const existing = rows?.[0];
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const updates: any = {};
    let adjustRemaining = 0;
    if (typeof seedType !== 'undefined') updates.seedType = seedType;
    if (typeof unit !== 'undefined') updates.unit = unit;
    if (typeof zoneId !== 'undefined') updates.zoneId = zoneId;
    if (typeof totalQuantity !== 'undefined') {
      const newTotal = Number(totalQuantity);
      if (isNaN(newTotal) || newTotal < 0) return NextResponse.json({ error: 'invalid_total' }, { status: 400 });
      updates.totalQuantity = newTotal;
      adjustRemaining = newTotal - Number(existing.totalQuantity || 0);
      updates.remainingQuantity = Number(existing.remainingQuantity || 0) + adjustRemaining;
      if (updates.remainingQuantity < 0) return NextResponse.json({ error: 'invalid_remaining' }, { status: 400 });
    }

    const [updated] = await db.update(schema.seedAllocations).set({ ...updates, updatedAt: new Date() }).where(eq(schema.seedAllocations.id, id)).returning();
    return NextResponse.json({ ok: true, allocation: updated ?? null });
  } catch (e) {
    console.error('allocations PATCH error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
