import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { 
  markPickedUp, 
  markDeliveryFailed, 
  updateAgentStatus, 
  getAgentDeliveryHistory 
} from '@/services/delivery.service';

// Définition des types pour plus de clarté
type DeliveryAction = 'PICKUP' | 'FAILED' | 'GO_ONLINE' | 'GO_OFFLINE';

interface StatusRequestBody {
  action: DeliveryAction;
  deliveryId?: string;
  reason?: string;
}

/**
 * POST /api/delivery/status
 * Met à jour le statut d'une livraison ou de l'agent.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentification et Vérification du rôle
    const session = await getSessionFromRequest(req as any);
    
    // IMPORTANT: On vérifie que l'utilisateur est connecté ET qu'il est un livreur/agent
    if (!session?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    
    if (session.role !== 'AGENT') {
      return NextResponse.json({ error: 'Accès refusé : rôle Agent requis' }, { status: 403 });
    }

    // 2. Récupération sécurisée du corps de la requête
    let body: StatusRequestBody;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: 'JSON malformé' }, { status: 400 });
    }

    const { action, deliveryId, reason } = body;
    let result;

    // 3. Logique métier
    switch (action) {
      case 'PICKUP':
        if (!deliveryId) return NextResponse.json({ error: 'deliveryId requis' }, { status: 400 });
        result = await markPickedUp(deliveryId, session.userId);
        break;

      case 'FAILED':
        if (!deliveryId) return NextResponse.json({ error: 'deliveryId requis' }, { status: 400 });
        result = await markDeliveryFailed(deliveryId, session.userId, reason);
        break;

      case 'GO_ONLINE':
        result = await updateAgentStatus(session.userId, 'AVAILABLE');
        break;

      case 'GO_OFFLINE':
        result = await updateAgentStatus(session.userId, 'OFFLINE');
        break;

      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    // 4. Gestion du résultat du service
    if (!result || !result.success) {
      return NextResponse.json({ error: result?.error || 'Une erreur est survenue' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('POST /api/delivery/status error:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

/**
 * GET /api/delivery/status
 * Historique des livraisons du transporteur connecté.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authentification et Vérification du rôle
    const session = await getSessionFromRequest(req as any);
    
    // IMPORTANT: On vérifie que l'utilisateur est connecté ET qu'il est un livreur/agent
    if (!session?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    
    if (session.role !== 'AGENT') {
      return NextResponse.json({ error: 'Accès refusé : rôle Agent requis' }, { status: 403 });
    }

    const history = await getAgentDeliveryHistory(session.userId);
    return NextResponse.json(history || []);

  } catch (error: any) {
    console.error('GET /api/delivery/status error:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}