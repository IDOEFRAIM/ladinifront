import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireProducer } from '@/lib/api-guard';
import { createProductFromForm, updateProductFromForm } from '@/features/products/services/product-form.service';
// DB access and ownership checks moved to actions
import { fetchProductsServer } from '@/features/products/actions/get-catalogue-products';
import { fetchDashboardInventoryServer } from '@/features/inventory/services/dashboard-inventory.service';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.webm'];
const UPLOAD_BASE_PATH = process.env.UPLOADS_DIR || 'public/uploads';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_AUDIO_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;

// product creation/update logic is delegated to app/actions/products.server

// ==========================================
// GET — Liste des produits
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await (await import('@/lib/session')).getSessionFromRequest({ cookies: cookieStore });
    const userId = session?.userId;

    // If producer => use dashboard server action
    if (userId) {
      const producerProducts = await fetchDashboardInventoryServer(userId as string);
      if (producerProducts && producerProducts.length > 0) return NextResponse.json(producerProducts);
    }

    // Public listing via centralized server action
    const url = new URL(req.url);
    const category = url.searchParams.get('category') || undefined;
    const region = url.searchParams.get('region') || undefined;
    const search = url.searchParams.get('search') || undefined;

    const products = await fetchProductsServer({ category, region, search });
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// POST — Création d'un produit
// ==========================================
export async function POST() {
  // Writes are deprecated - use server actions (`createProductAction`) instead.
  return NextResponse.json({ error: 'Deprecated: use server actions (createProductAction)' }, { status: 410 });
}

// ==========================================
// PUT — Modification d'un produit
// ==========================================
export async function PUT() {
  // Writes are deprecated - use server actions (`updateProductAction`) instead.
  return NextResponse.json({ error: 'Deprecated: use server actions (updateProductAction)' }, { status: 410 });
}