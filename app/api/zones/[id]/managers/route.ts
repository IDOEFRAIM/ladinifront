import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';
import { assignAgentToWorkZone } from '@/services/membership.service';

// GET: list managers for a zone (work_zones + user_organizations entries)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const zoneId = parts[parts.indexOf('zones') + 1];
  try {
    const work = await db.select({ id: schema.workZones.id, organizationId: schema.workZones.organizationId, managerId: schema.workZones.managerId, role: schema.workZones.role })
      .from(schema.workZones)
      .where(eq(schema.workZones.zoneId, zoneId));

    const managed = await db.select({ id: schema.userOrganizations.id, userId: schema.userOrganizations.userId, organizationId: schema.userOrganizations.organizationId, role: schema.userOrganizations.role })
      .from(schema.userOrganizations)
      .where(eq(schema.userOrganizations.managedZoneId, zoneId));

    // Enrich with user info
    const userIds = Array.from(new Set([...(work.map(w => w.managerId || '')), ...(managed.map(m => m.userId || ''))].filter(Boolean)));
    let users: any[] = [];
    if (userIds.length > 0) {
      for (const uid of userIds) {
        try {
          const u = await db.query.users.findFirst({ where: eq(schema.users.id, uid) });
          if (u) users.push(u);
        } catch (e) { /* ignore individual lookup errors */ }
      }
    }

    return NextResponse.json({ success: true, data: { workZones: work, managedMembers: managed, users } });
  } catch (e) {
    console.error('api/zones/[id]/managers GET error', e);
    return NextResponse.json({ success: false, error: 'Erreur' }, { status: 500 });
  }
}

// PATCH: assign a manager for a zone (requires org ADMIN) — expects { agentUserId }
export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const zoneId = parts[parts.indexOf('zones') + 1];
  try {
    const body = await req.json();
    let agentUserId = body.agentUserId;
    const agentIdentifier = body.agentIdentifier; // email or phone

    // If caller provided identifier (email/phone), try to resolve to user id later
    if (!agentUserId && agentIdentifier) {
      try {
        const u = await db.query.users.findFirst({ where: or(eq(schema.users.email, agentIdentifier), eq(schema.users.phone, agentIdentifier)), columns: { id: true } });
        if (u) agentUserId = u.id;
      } catch (e) {
        // ignore
      }
    }

    if (!agentUserId) {
      console.debug('[api/zones/[id]/managers PATCH] missing agentUserId, body:', body);
      return NextResponse.json({ success: false, error: 'agentUserId required (or agentIdentifier that resolves to a user)' }, { status: 400 });
    }

    // Get session user (admin) and active org from cookies/header
    const session = await getSessionFromRequest(req as any);
    const adminUserId = session?.userId;
    if (!adminUserId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Resolve organization id: prefer explicit header, cookie, fall back to request body or session payload
    let orgId: string | undefined;
    try {
      // 1) header override (useful for API clients)
      const headerOrg = (req.headers as any).get ? (req.headers as any).get('x-organization-id') : undefined;
      if (headerOrg) orgId = headerOrg;
    } catch (e) { /* ignore */ }

    try {
      // 2) cookie
      if (!orgId) {
        const raw = (req.headers as any).get ? (req.headers as any).get('cookie') : undefined;
        if (raw) {
          // Try active-org-id cookie
          const match = raw.match(new RegExp(COOKIE_NAMES.ACTIVE_ORG_ID + '=([^;]+)'));
          if (match) orgId = decodeURIComponent(match[1]);
          // Also accept legacy/user-org cookie
          if (!orgId) {
            const m2 = raw.match(new RegExp(COOKIE_NAMES.USER_ORG + '=([^;]+)'));
            if (m2) orgId = decodeURIComponent(m2[1]);
          }
        }
      }
    } catch (e) { /* ignore */ }

    // Fallback: caller may include organization id in request body
    if (!orgId && body && (body.orgId || body.organizationId)) {
      orgId = body.orgId || body.organizationId;
    }

    // Fallback: session payload may contain activeOrgId
    if (!orgId && (session as any)?.activeOrgId) {
      orgId = (session as any).activeOrgId;
    }

    if (!orgId) {
      // Try to load organizationId from zone record as last resort
      try {
        const z = await db.query.zones.findFirst({ where: eq(schema.zones.id, zoneId), columns: { organizationId: true } });
        if (z?.organizationId) orgId = z.organizationId;
      } catch (e) {
        // ignore
      }
    }

    // Additional fallback: check work_zones table for an organization associated to this zone
    if (!orgId) {
      try {
        const w = await db.query.workZones.findFirst({ where: eq(schema.workZones.zoneId, zoneId), columns: { organizationId: true } });
        if (w?.organizationId) orgId = w.organizationId;
      } catch (e) {
        // ignore
      }
    }

    // Final fallback: if admin user belongs to exactly one organization with an admin/owner/manager role, use it
    if (!orgId) {
      try {
        const memberships = await db.select({ organizationId: schema.userOrganizations.organizationId, role: schema.userOrganizations.role })
          .from(schema.userOrganizations)
          .where(eq(schema.userOrganizations.userId, adminUserId));
        const adminOrgs = memberships.filter((m: any) => {
          const r = String(m.role || '').toLowerCase();
          return r.includes('admin') || r.includes('owner') || r.includes('manager');
        }).map((m: any) => m.organizationId).filter(Boolean);
        const uniqueOrgs = Array.from(new Set(adminOrgs));
        if (uniqueOrgs.length === 1) {
          orgId = uniqueOrgs[0];
        }
      } catch (e) {
        // ignore lookup errors
      }
    }

    if (!orgId) {
      console.debug('[api/zones/[id]/managers PATCH] missing orgId, attempted sources: header|cookie|body|session|zone|work_zones|user_membership, body:', body, 'resolved agentUserId:', agentUserId, 'session:', session && { userId: session.userId, activeOrgId: (session as any).activeOrgId });
      return NextResponse.json({ success: false, error: 'Active organization not found. Provide orgId in request body or x-organization-id header, or ensure the zone is linked to an organization.' }, { status: 400 });
    }

    // Ensure orgId is a plain string (defensive in case a caller sent an object)
    function normalizeOrgId(raw: any): string | undefined {
      if (!raw && raw !== 0) return undefined;
      // If it's a JSON string like '{"organizationId":"...","role":"ADMIN"}', try parse it
      if (typeof raw === 'string') {
        const s = raw.trim();
        if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('"{') && s.endsWith('}"'))) {
          try {
            const parsed = JSON.parse(s);
            return normalizeOrgId(parsed);
          } catch (e) {
            // fall through and return string as-is
          }
        }
        return raw;
      }
      if (typeof raw === 'object') {
        if (raw.organizationId) return String(raw.organizationId);
        if (raw.organization && (raw.organization.id || raw.organization.organizationId)) return String(raw.organization.id || raw.organization.organizationId);
        // If it's a DB row-like object { organizationId: '...', role: 'ADMIN' }
        for (const key of Object.keys(raw)) {
          const v = raw[key];
          if (typeof v === 'string' && /^[0-9a-fA-F-]{36}$/.test(v)) return v;
        }
      }
      return undefined;
    }

    const normalizedOrg = normalizeOrgId(orgId);
    if (!normalizedOrg) {
      console.error('[api/zones/[id]/managers PATCH] invalid orgId value (cannot normalize):', orgId, 'headers:', { 'x-organization-id': (req.headers as any).get && (req.headers as any).get('x-organization-id'), cookie: (req.headers as any).get && (req.headers as any).get('cookie') });
      return NextResponse.json({ success: false, error: 'Invalid organization id provided. Send plain organization id string or x-organization-id header.' }, { status: 400 });
    }
    orgId = normalizedOrg;

    // Delegate to service which enforces admin rights
    const workZone = await assignAgentToWorkZone(adminUserId, orgId, agentUserId, zoneId, 'ZONE_MANAGER');
    return NextResponse.json({ success: true, data: workZone });
  } catch (e) {
    console.error('api/zones/[id]/managers PATCH error', e);
    return NextResponse.json({ success: false, error: 'Erreur' }, { status: 500 });
  }
}
