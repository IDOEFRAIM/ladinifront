// app/api/monitoring/actions/bulk-approve/route.ts
// =========================================================
// Approbation en masse (ADMIN uniquement)
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-guard';

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

    const result = await prisma.agentAction.updateMany({
      where: {
        id: { in: actionIds },
        status: 'PENDING', // Only update pending actions
      },
      data: {
        status: decision,
        adminNotes: adminNotes || null,
        validatedById: user.id,
      },
    });

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    console.error('[API] /monitoring/actions/bulk-approve error:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la validation en masse.' },
      { status: 500 }
    );
  }
}
