// app/api/monitoring/actions/[id]/approve/route.ts
// =========================================================
// Approbation / Rejet d'une AgentAction (ADMIN uniquement)
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { approveAgentAction } from '@/app/actions/monitoring.server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
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

    try {
      const updated = await approveAgentAction(id, ctx.userId, decision as 'APPROVED' | 'REJECTED', adminNotes);
      return NextResponse.json(updated);
    } catch (e: any) {
      if (e?.message === 'INSUFFICIENT_PERMISSIONS') {
        return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 });
      }
      if (e?.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Action introuvable.' }, { status: 404 });
      }
      if (e?.message === 'ALREADY_PROCESSED') {
        return NextResponse.json({ error: 'Action déjà traitée.' }, { status: 409 });
      }
      throw e;
    }
  } catch (err) {
    console.error('[API] /monitoring/actions/[id]/approve error:', err);
    return NextResponse.json(
      { error: "Erreur lors de la validation." },
      { status: 500 }
    );
  }
}
