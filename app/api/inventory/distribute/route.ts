import { NextResponse } from 'next/server';
import { db, schema } from '@/src/db';
import { eq, and } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { buildAccessContext } from '@/lib/access-context';
import { AccessManager } from '@/lib/access-manager';
import { PERMISSIONS } from '@/lib/permissions';
import { initializeSeedDistribution } from '@/services/seedDistribution.service';

export async function POST(req: Request) {
  const body = await req.json();
  const { allocationId, producerId, assignedTo, quantity, cnibProvided, channel } = body;
  if (!allocationId || !producerId || !quantity) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  // Authentication + authorization
  const session = await getSessionFromRequest(req as any);
  if (!session || !session.userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const ctx = await buildAccessContext(session.userId);

  // Load allocation to derive org/zone from DB (never trust client payload)
  const allocation = await db.query.seedAllocations.findFirst({
    where: eq(schema.seedAllocations.id, allocationId),
    columns: { id: true, organizationId: true, zoneId: true },
  });
  if (!allocation) return NextResponse.json({ error: 'allocation_not_found' }, { status: 404 });

  const organizationId = allocation.organizationId;
  const zoneId = allocation.zoneId;

  // Determine effective agent:
  // - default: the authenticated user is the agent
  // - if assignedTo is provided: only org/system admins can assign to someone else
  let effectiveAgentId = session.userId;
  if (assignedTo) {
    effectiveAgentId = String(assignedTo);
  }

  // Determine if caller is org/system admin. Admins can create/assign without STOCK_VERIFY.
  let isOrgOrSystemAdmin = false;

  // Enforce that ONLY an organization ADMIN (or system ADMIN) can create distributions.
  try {
    const userRows = await db.select({ id: schema.users.id, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);
    const user = userRows?.[0];
    const sysRole = String(user?.role || '').toUpperCase();
    // If not a system admin, ensure user is an org ADMIN
    if (sysRole === 'SUPERADMIN' || sysRole === 'ADMIN') {
      isOrgOrSystemAdmin = true;
    } else {
      const membershipRows = await db.select({ role: schema.userOrganizations.role })
        .from(schema.userOrganizations)
        .where(and(eq(schema.userOrganizations.userId, session.userId), eq(schema.userOrganizations.organizationId, organizationId)))
        .limit(1);
      const mem = membershipRows?.[0];
      if (mem && String(mem.role) === 'ADMIN') {
        isOrgOrSystemAdmin = true;
      } else {
        isOrgOrSystemAdmin = false;
      }
    }
  } catch (e) {
    console.error('Error validating creator admin role', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  // Require appropriate permission and that user/agent manages the zone/org
  // but skip this check for org/system admins (they are allowed).
  if (!isOrgOrSystemAdmin) {
    const resp = AccessManager.can(ctx)
      .permission(PERMISSIONS.STOCK_VERIFY)
      .inOrg(organizationId)
      .inZone(zoneId)
      .toResponse();
    if (resp) {
      try {
        console.warn('Access denied for inventory/distribute', {
          userId: session.userId,
          requestedOrg: organizationId,
          requestedZone: zoneId,
          userOrgs: ctx.organizationIds,
          managedZones: Array.from(ctx.managedZoneIds || []),
          hasStockVerify: ctx.permissions.has(PERMISSIONS.STOCK_VERIFY),
        });
      } catch (e) {
        console.warn('Access denied (unable to serialize ctx)');
      }
      return resp;
    }
  }

  // Non-admin callers cannot assign distributions to other members.
  if (assignedTo && !isOrgOrSystemAdmin) {
    effectiveAgentId = session.userId;
  }

  // If the caller assigned the distribution to another member, verify that the
  // assigned user belongs to the same organization and has an allowed role.
  if (assignedTo) {
    try {
      const membershipRows = await db.select({ id: schema.userOrganizations.id, role: schema.userOrganizations.role, userId: schema.userOrganizations.userId })
        .from(schema.userOrganizations)
        .where(and(eq(schema.userOrganizations.userId, assignedTo), eq(schema.userOrganizations.organizationId, organizationId)))
        .limit(1);
      const m = membershipRows?.[0];
      if (!m) return NextResponse.json({ error: 'assigned_user_not_in_org' }, { status: 400 });
      const allowed = ['ADMIN', 'ZONE_MANAGER', 'FIELD_AGENT'];
      if (!allowed.includes(String(m.role))) return NextResponse.json({ error: 'assigned_user_not_allowed' }, { status: 403 });
    } catch (e) {
      console.error('Error validating assignedTo membership', e);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
  }

  try {
    const result = await initializeSeedDistribution(
      effectiveAgentId,
      producerId,
      allocationId,
      Number(quantity),
      cnibProvided,
      channel || 'IN_APP'
    );
    return NextResponse.json({ ok: true, distributionId: result.distributionId });
  } catch (e: any) {
    const msg = String(e?.message || 'server_error');
    if (msg.toLowerCase().includes('introuvable')) return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.toLowerCase().includes('stock') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('missing')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg.toLowerCase().includes('accès') || msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('hors zone')) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    console.error('inventory/distribute failed', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
