// app/api/monitoring/actions/[id]/approve/route.ts
// =========================================================
// Approbation / Rejet d'une AgentAction (ADMIN uniquement)
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';
import { userHasPermission } from '@/services/role.service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  const user: any = { id: ctx.userId, role: ctx.role };

  // Permission check: allow users with explicit approver permission
  const canApprove = await userHasPermission(user.id, 'AGENT_ACTION_APPROVE');
  if (!canApprove) {
    return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { decision, adminNotes } = body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json(
        { error: 'Décision invalide. Utilisez APPROVED ou REJECTED.' },
        { status: 400 }
      );
    }

    const action = await db.query.agentActions.findFirst({ where: eq(schema.agentActions.id, id) });
    if (!action) {
      return NextResponse.json({ error: 'Action introuvable.' }, { status: 404 });
    }

    if (action.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Action déjà traitée (statut: ${action.status}).` },
        { status: 409 }
      );
    }

    const [updated] = await db.update(schema.agentActions)
      .set({
        status: decision,
        adminNotes: adminNotes || null,
        validatedById: user.id,
      })
      .where(eq(schema.agentActions.id, id))
      .returning();

    // Fetch with relations for the response
    const updatedWithRelations = await db.query.agentActions.findFirst({
      where: eq(schema.agentActions.id, id),
      with: {
        order: {
          columns: { id: true, totalAmount: true, status: true, customerName: true },
        },
        user: {
          columns: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(updatedWithRelations);
  } catch (err) {
    console.error('[API] /monitoring/actions/[id]/approve error:', err);
    return NextResponse.json(
      { error: "Erreur lors de la validation." },
      { status: 500 }
    );
  }
}
