import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { OrderSchema } from '@/lib/validators';
import { createOrderService } from '@/services/orders.service';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, requireProducer } from '@/lib/api-guard';

const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5 MB

// ╔══════════════════════════════════════════════╗
// ║  GET — Commandes du producteur               ║
// ╚══════════════════════════════════════════════╝

export async function GET(req: NextRequest) {
    try {
        const { user, error } = await requireProducer(req);
        
        if (error || !user) return error!;

        // Le user est déjà récupéré via le cookie par getAuthenticatedUser
        const userId = user.id;

        const producer = await prisma.producer.findUnique({
            where: { userId: userId }, // On cherche par userId car c'est une relation one-to-one
            select: { id: true } 
        });

        if (!producer) {
            return NextResponse.json({ error: "Profil producteur introuvable" }, { status: 404 });
        }

        const orderItems = await prisma.orderItem.findMany({
          where: {
            product: { producerId: producer.id }
          },
          include: {
            order: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                customerName: true,
                customerPhone: true,
                city: true,
                deliveryDesc: true,
                buyerId: true,
                buyer: { select: { name: true, phone: true } }
              }
            },
            product: { select: { name: true, unit: true } }
          },
          orderBy: { order: { createdAt: 'desc' } }
        });

        // Regrouper par commande
        const ordersMap = new Map();
        for (const item of orderItems) {
            const orderId = item.orderId;
            if (!ordersMap.has(orderId)) {
                ordersMap.set(orderId, {
                  id: orderId,
                  customerName: item.order.buyer?.name || item.order.customerName || "Client",
                  customerPhone: item.order.buyer?.phone || item.order.customerPhone || "",
                  // Prefer explicit city, then delivery description as a fallback for the producer
                  location: item.order.city || item.order.deliveryDesc || "",
                  // expose buyerId when available (helps linking to client profile)
                  buyerId: item.order.buyerId || null,
                  date: item.order.createdAt,
                  total: 0,
                  status: (item.order.status as string || 'PENDING').toLowerCase(),
                  items: []
                });
            }
            const order = ordersMap.get(orderId);
            order.items.push({
                name: item.product.name,
                quantity: item.quantity,
                unit: item.product.unit,
                price: item.priceAtSale
            });
            order.total += item.quantity * item.priceAtSale;
        }

        return NextResponse.json(Array.from(ordersMap.values()));
    } catch (error) {
        console.error("GET /api/orders Error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// ╔══════════════════════════════════════════════╗
// ║  POST — Créer une commande                   ║
// ╚══════════════════════════════════════════════╝

export async function POST(req: NextRequest) {
  try {
    // Try to resolve an authenticated user (optional). If present, link the order to them.
    const { user } = await getAuthenticatedUser(req);
    const buyerId = user?.id;

    const formData = await req.formData();
    const rawData = formData.get('data') as string;
    const voiceFile = formData.get('voiceNote') as File | null;

    if (!rawData) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    let json: unknown;
    try {
      json = JSON.parse(rawData);
    } catch {
      return NextResponse.json({ error: "Format de données invalide" }, { status: 400 });
    }

    const validation = OrderSchema.safeParse(json);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation: ${errors}` }, { status: 400 });
    }

    const orderData = validation.data;

    // Gestion audio avec validation de taille
    let savedAudioUrl: string | null = null;
    if (voiceFile && voiceFile.size > 0) {
      if (voiceFile.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ error: "Fichier audio trop volumineux (max 5 MB)" }, { status: 400 });
      }
      const fileName = `${Date.now()}_order.webm`;
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'audio');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, fileName), Buffer.from(await voiceFile.arrayBuffer()));
      savedAudioUrl = `/uploads/audio/${fileName}`;
    }

    const newOrder = await createOrderService({
      customerName: orderData.customer.name,
      customerPhone: orderData.customer.phone,
      totalAmount: orderData.totalAmount,
      paymentMethod: orderData.paymentMethodId,
      city: orderData.delivery.city,
      gpsLat: orderData.delivery.lat,
      gpsLng: orderData.delivery.lng,
      deliveryDesc: orderData.delivery.description,
      audioUrl: savedAudioUrl,
      locationId: orderData.locationId,
      // Link to authenticated buyer when available
      buyerId: buyerId,
      items: orderData.items.map(item => ({
        productId: item.id,
        quantity: item.qty,
        price: item.price
      }))
    });

    return NextResponse.json({ success: true, orderId: newOrder.id }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/orders Error:", error);
    return NextResponse.json({ error: error?.message || "Erreur serveur" }, { status: 500 });
  }
}