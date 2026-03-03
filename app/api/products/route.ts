import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { getAuthenticatedUser, requireProducer } from '@/lib/api-guard';
import { CreateProductSchema } from '@/lib/validators';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.webm'];
const UPLOAD_BASE_PATH = 'public/uploads';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_AUDIO_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;

/**
 * Utilitaire pour sauvegarder les fichiers sur le disque
 */
async function saveFile(file: File, folder: string) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const originalExt = path.extname(file.name).toLowerCase();
  const extension = ALLOWED_EXTENSIONS.includes(originalExt)
    ? originalExt
    : file.type === 'audio/webm' ? '.webm' : '.jpg';

  const uniqueId = Math.random().toString(36).substring(2, 10);
  const fileName = `${Date.now()}-${uniqueId}${extension}`;

  const uploadDir = path.join(process.cwd(), UPLOAD_BASE_PATH, folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);
  return fileName;
}

// ==========================================
// GET — Liste des produits
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await (await import('@/lib/session')).getSessionFromRequest({ cookies: cookieStore } as any);
    const userId = session?.userId;

    // Si un utilisateur est connecté, on vérifie s'il est producteur
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { producer: { select: { id: true } } },
      });

      // Si c'est un producteur, on lui renvoie ses propres produits pour son dashboard
      if (user?.producer) {
        const products = await prisma.product.findMany({
          where: { producerId: user.producer.id },
          orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(products);
      }
    }

    // Sinon (Public), on renvoie tous les produits avec les infos des vendeurs
    const allProducts = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        producer: {
          include: { user: { select: { name: true, image: true } } },
        },
      },
    });
    return NextResponse.json(allProducts);
  } catch (error) {
    console.error("GET /api/products Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ==========================================
// POST — Création d'un produit
// ==========================================
export async function POST(req: NextRequest) {
  try {
    // getAuthenticatedUser vérifie le cookie HttpOnly en interne
    const { user, error } = await requireProducer(req);
    if (error || !user) return error || NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const formData = await req.formData();

    // Validation des champs texte
    const raw = {
      name: formData.get('name') as string,
      categoryLabel: formData.get('categoryLabel') as string,
      description: (formData.get('description') as string) || undefined,
      price: parseFloat(formData.get('price') as string) || 0,
      quantityForSale: parseFloat(formData.get('quantity') as string) || 0,
      unit: (formData.get('unit') as string) || 'KG',
    };

    const validation = CreateProductSchema.safeParse(raw);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de formulaire invalides" }, { status: 400 });
    }

    // Traitement des images
    const imageFiles = (formData.getAll('images') as File[]).filter(f => f.size > 0);
    if (imageFiles.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Max ${MAX_IMAGES} images` }, { status: 400 });
    }
    const imageNames = await Promise.all(imageFiles.map(f => saveFile(f, 'products')));

    // Traitement de l'audio
    let audioName: string | null = null;
    const audioFile = formData.get('audio') as File;
    if (audioFile && audioFile.size > 0) {
      audioName = await saveFile(audioFile, 'audio');
    }

    // Création en base de données
    if (!user.producerId) {
      return NextResponse.json({ error: "ID producteur manquant" }, { status: 400 });
    }
    const product = await prisma.product.create({
      data: {
        ...validation.data,
        images: imageNames,
        audioUrl: audioName,
        producerId: user.producerId, // Récupéré de la session sécurisée
        // Prisma expects `unit` as enum; cast from validation result
        unit: validation.data.unit as any,
      },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products Error:", error);
    return NextResponse.json({ error: "Échec de la création" }, { status: 500 });
  }
}

// ==========================================
// PUT — Modification d'un produit
// ==========================================
export async function PUT(req: NextRequest) {
  try {
    const { user, error } = await requireProducer(req);
    if (error || !user) return error || NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const formData = await req.formData();
    const productId = formData.get('id') as string; // L'ID du produit à modifier

    if (!productId) {
      return NextResponse.json({ error: "ID du produit manquant" }, { status: 400 });
    }

    // Vérification de propriété
    const oldProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!oldProduct) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    
    // Sécurité : Un producteur ne peut modifier que ses propres produits
    if (oldProduct.producerId !== user.producerId) {
      return NextResponse.json({ error: "Action interdite" }, { status: 403 });
    }

    // Gestion des images (anciennes vs nouvelles)
    let existingImages: string[] = [];
    try {
      existingImages = JSON.parse(formData.get('existingImages') as string || '[]');
    } catch {
      existingImages = oldProduct.images;
    }

    const newFiles = (formData.getAll('images') as File[]).filter(f => f.size > 0);
    const newImageNames = await Promise.all(newFiles.map(f => saveFile(f, 'products')));
    const finalImages = [...existingImages, ...newImageNames];

    // Suppression physique des images retirées
    const imagesToRemove = oldProduct.images.filter(img => !existingImages.includes(img));
    for (const img of imagesToRemove) {
      try { await unlink(path.join(process.cwd(), UPLOAD_BASE_PATH, 'products', img)); } catch {}
    }

    // Gestion Audio
    let audioName = oldProduct.audioUrl;
    const newAudioFile = formData.get('audio') as File;
    if (newAudioFile && newAudioFile.size > 0) {
      audioName = await saveFile(newAudioFile, 'audio');
      if (oldProduct.audioUrl) {
        try { await unlink(path.join(process.cwd(), UPLOAD_BASE_PATH, 'audio', oldProduct.audioUrl)); } catch {}
      }
    }

    // Mise à jour
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: formData.get('name') as string,
        categoryLabel: formData.get('categoryLabel') as string,
        description: (formData.get('description') as string) || null,
        price: parseFloat(formData.get('price') as string),
        quantityForSale: parseFloat(formData.get('quantity') as string),
        unit: formData.get('unit') as any,
        images: finalImages,
        audioUrl: audioName,
      },
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error("PUT /api/products Error:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}