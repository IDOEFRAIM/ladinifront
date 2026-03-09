import { NextRequest, NextResponse } from 'next/server';
import { UpdateOrderStatusSchema } from '@/lib/validators';
import { requireProducer } from '@/lib/api-guard';

/**
 * GET : Récupère les détails d'une commande spécifique pour un producteur
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { user, error } = await requireProducer(req);
        if (error || !user) return error!;

        const { fetchOrderDetailsForProducer } = await import('@/app/actions/orders.server');
        const details = await fetchOrderDetailsForProducer(id, user.id);
        if (!details) return NextResponse.json({ error: 'Commande introuvable ou accès refusé' }, { status: 404 });
        return NextResponse.json(details);

    } catch (error) {
        console.error("GET /api/orders/[id] Error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

/**
 * PATCH : Met à jour le statut d'une commande
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { user, error } = await requireProducer(req);
        if (error || !user) return error!;

        const body = await req.json();
        const validation = UpdateOrderStatusSchema.safeParse(body);
        if (!validation.success) return NextResponse.json({ error: 'Statut invalide', details: validation.error.format() }, { status: 400 });

        const { updateOrderStatusAction } = await import('@/app/actions/orders.server');
                // Delegate authorization + update to action
                try {
                    const updated = await updateOrderStatusAction(id, validation.data.statusId, user.id);
                    return NextResponse.json(updated);
                } catch (e: any) {
                    if (e?.code === 'FORBIDDEN') return NextResponse.json({ error: 'Action non autorisée sur cette commande' }, { status: 403 });
                    throw e;
                }

    } catch (error) {
        console.error("PATCH /api/orders/[id] Error:", error);
        return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }
}