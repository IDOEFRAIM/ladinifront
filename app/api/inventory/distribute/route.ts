import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { db, schema } from '@/src/db';
import { eq, and, sql } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { buildAccessContext } from '@/lib/access-context';
import { AccessManager } from '@/lib/access-manager';
import { PERMISSIONS } from '@/lib/permissions';

export async function POST(req: Request) {
  const body = await req.json();
  const { allocationId, producerId, agentId, assignedTo, organizationId, zoneId, quantity } = body;
  // allow API callers to pass `assignedTo` (user id of member who will dispatch)
  // and treat it as the agent responsible for the distribution
  const effectiveAgentId = assignedTo ?? agentId;
  if (!allocationId || !producerId || !effectiveAgentId || !quantity) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  // Authentication + authorization
  const session = await getSessionFromRequest(req as any);
  if (!session || !session.userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const ctx = await buildAccessContext(session.userId);

  // We'll first determine if the user is an org or system admin. Admins
  // are allowed to create distributions without the STOCK_VERIFY permission.
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
      if (!isOrgOrSystemAdmin) {
        // Not an admin: fallthrough, we'll later enforce agent permissions.
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

  // generate 6-digit numeric code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + code).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const now = new Date();

  // insert distribution record
  const inserted = await db.insert(schema.seedDistributions).values({
    allocationId,
    producerId,
    agentId: effectiveAgentId,
    organizationId,
    zoneId,
    quantity,
    verificationCodeHash: hash,
    verificationCodeExpiresAt: expiresAt,
    verificationChannel: 'IN_APP',
    attemptsCount: 0,
    status: 'PENDING',
    metadata: { salt },
    createdAt: now,
    updatedAt: now,
  }).returning({ id: schema.seedDistributions.id });

  const distributionId = inserted?.[0]?.id ?? null;

  // Enqueue agent action to deliver the verification code via secure channel
  try {
    await db.insert(schema.agentActions).values({
      agentName: 'DISTRIBUTION_VERIFICATION',
      actionType: 'SEND_VERIFICATION',
      payload: { distributionId, producerId, channel: 'IN_APP', assignedTo: effectiveAgentId, verificationCode: code },
      status: 'PENDING',
      userId: session.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (e) {
    // non-fatal: log and continue
    console.error('Failed to enqueue agent action for distribution verification', e);
  }

  // Do NOT return the OTP code in responses. Return only distribution id.
  return NextResponse.json({ ok: true, distributionId });
}
