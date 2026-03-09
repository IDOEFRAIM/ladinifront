// app/api/monitoring/actions/bulk-approve/route.ts
// =========================================================
// Approbation en masse (ADMIN uniquement)
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';
import { bulkApproveAgentActions } from '@/app/actions/monitoring.server';

export async function PATCH(req: NextRequest): Promise<Response | void> {
  const { user, error } = await requireAdmin(req);
  if (error || !user) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { actionIds, decision, adminNotes } = body;

    if (!Array.isArray(actionIds) || actionIds.length === 0) {
      return NextResponse.json(
        { error: 'Liste d\'IDs requise.' },
        { status: 400 }
      );
    }

    if (actionIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 actions par lot.' },
        { status: 400 }
      );
    }

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json(
        { error: 'Décision invalide.' },
        { status: 400 }
      );
    }

    try {
      const result = await bulkApproveAgentActions(user.id, actionIds, decision as 'APPROVED' | 'REJECTED', adminNotes);
      // normalize driver result
      const updated = Array.isArray(result) ? result.length : Number(result) || 0;
      return NextResponse.json({ updated });
    } catch (e: any) {
      if (e?.message === 'INSUFFICIENT_PERMISSIONS') {
        return NextResponse.json({ error: 'Permissions insuffisantes.' }, { status: 403 });
      }
      if (e?.message === 'INVALID_INPUT') {
        return NextResponse.json({ error: 'Entrée invalide.' }, { status: 400 });
      }
      if (e?.message === 'TOO_MANY') {
        return NextResponse.json({ error: 'Trop d\'éléments.' }, { status: 400 });
      }
      throw e;
    }
  } catch (err) {
    console.error('[API] /monitoring/actions/bulk-approve error:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la validation en masse.' },
      { status: 500 }
    );
  }
}
