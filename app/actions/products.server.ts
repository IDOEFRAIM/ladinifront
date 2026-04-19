import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { CreateProductSchema } from '@/lib/validators';
import { unlink, mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { uploadBufferToSupabase, removeFileFromSupabase } from '@/lib/supabase.server';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.webm'];
const UPLOAD_BASE_PATH = process.env.UPLOADS_DIR || 'public/uploads';
const MAX_IMAGES = 5;

function getFileExtension(file: File): string {
  const originalExt = path.extname((file as any).name || '').toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(originalExt)) {
    return originalExt;
  }
  if ((file as any).type === 'audio/webm') {
    return '.webm';
  }
  return '.jpg';
}

function generateFileName(extension: string): string {
  const uniqueId = Math.random().toString(36).substring(2, 10);
  return `${Date.now()}-${uniqueId}${extension}`;
}

async function saveFile(file: File, folder: string) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = getFileExtension(file);
  const fileName = generateFileName(extension);
  try {
    // Try uploading to Supabase first
    try {
      const remotePath = `${folder}/${fileName}`;
      const publicUrl = await uploadBufferToSupabase(remotePath, buffer, (file as any).type || undefined);
      if (publicUrl) return publicUrl;
    } catch (e) {
      console.warn('Supabase upload failed for saveFile, falling back to local FS', e);
    }

    // Fallback to local filesystem
    const uploadDir = path.join(process.cwd(), UPLOAD_BASE_PATH, folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);
    return fileName;
  } catch (err: any) {
    if (err?.code === 'EROFS' || err?.code === 'EACCES') {
      const e = new Error('Server filesystem is read-only. Configure UPLOADS_DIR or external storage.');
      (e as any).code = 'READ_ONLY_FS';
      throw e;
    }
    throw err;
  }
}

function parseStringField(formData: FormData, key: string, defaultValue: string = ''): string {
  return String(formData.get(key) || defaultValue);
}

function parseOptionalStringField(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) || '');
  return value || undefined;
}

function parseNumberField(formData: FormData, key: string, defaultValue: number = 0): number {
  return parseFloat(String(formData.get(key) || defaultValue)) || defaultValue;
}

function parseOptionalNumberField(formData: FormData, key: string): number | undefined {
  const raw = formData.get(key);
  if (raw == null) return undefined;
  const n = parseFloat(String(raw));
  return Number.isNaN(n) ? undefined : n;
}

function parseProductFormData(formData: FormData) {
  return {
    name: parseStringField(formData, 'name'),
    categoryLabel: parseStringField(formData, 'categoryLabel'),
    description: parseOptionalStringField(formData, 'description'),
    price: parseNumberField(formData, 'price'),
    quantityForSale: parseNumberField(formData, 'quantity'),
    unit: parseStringField(formData, 'unit', 'KG'),
  };
}

async function validateProductFormData(formData: FormData) {
  const raw = parseProductFormData(formData);
  const validation = CreateProductSchema.safeParse(raw);
  if (!validation.success) {
    const err = new Error('Invalid form data');
    (err as any).code = 'INVALID_FORM';
    // Attach Zod validation details and the parsed raw input for debugging
    (err as any).validation = validation.error;
    (err as any).raw = raw;
    console.warn('Product form validation failed', { raw, errors: validation.error.format?.() ?? validation.error.issues });
    throw err;
  }
  return validation;
}

async function validateProductUpdateFormData(formData: FormData) {
  const values: any = {};
  const name = parseOptionalStringField(formData, 'name');
  if (name) values.name = name;
  const categoryLabel = parseOptionalStringField(formData, 'categoryLabel');
  if (categoryLabel) values.categoryLabel = categoryLabel;
  const catId = parseOptionalStringField(formData, 'categoryId');
  if (catId) values.subCategoryId = catId;
  const description = parseOptionalStringField(formData, 'description');
  if (description) values.description = description;
  const price = parseOptionalNumberField(formData, 'price');
  if (price !== undefined) values.price = price;
  const quantity = parseOptionalNumberField(formData, 'quantity');
  if (quantity !== undefined) values.quantityForSale = quantity;
  const unit = parseOptionalStringField(formData, 'unit');
  if (unit) values.unit = unit;
  return values;
}

async function processProductImages(formData: FormData) {
  const imageFiles = (formData.getAll('images') as File[]).filter(f => f && (f as any).size > 0);
  if (imageFiles.length > MAX_IMAGES) {
    const err = new Error('TOO_MANY_IMAGES');
    (err as any).code = 'TOO_MANY_IMAGES';
    throw err;
  }
  return await Promise.all(imageFiles.map(f => saveFile(f, 'products')));
}

async function processProductAudio(formData: FormData) {
  const audioFile = formData.get('audio') as File;
  if (audioFile && (audioFile as any).size > 0) {
    return await saveFile(audioFile, 'audio');
  }
  return null;
}

async function updateProductImages(formData: FormData, oldImages: string[]) {
  let existingImages: string[] = [];
  try { existingImages = JSON.parse(String(formData.get('existingImages') || '[]')); } catch { existingImages = oldImages || []; }

  const newFiles = (formData.getAll('images') as File[]).filter(f => f && (f as any).size > 0);
  const newImageNames = await Promise.all(newFiles.map(f => saveFile(f, 'products')));
  const finalImages = [...existingImages, ...newImageNames];

  // Remove old images that were deleted
  const imagesToRemove = (oldImages || []).filter((img: string) => !existingImages.includes(img));
  for (const img of imagesToRemove) {
    try {
      // If stored as public URL, attempt to remove by deriving key; otherwise try remove by filename
      if (typeof img === 'string' && img.startsWith('http')) {
        try {
          // Attempt to derive storage path from URL (best-effort)
          const url = new URL(img);
          const pathname = url.pathname.replace(/^\//, '');
          // Remove leading bucket path if present
          const candidate = pathname.includes('/') ? pathname.split('/').slice(-2).join('/') : pathname;
          await removeFileFromSupabase(candidate);
        } catch (err) {
          // ignore
        }
      } else {
        try { await removeFileFromSupabase(`products/${img}`); } catch (err) { try { await unlink(path.join(process.cwd(), UPLOAD_BASE_PATH, 'products', img)); } catch {} }
      }
    } catch {}
  }

  return finalImages;
}

async function updateProductAudio(formData: FormData, oldAudioUrl: string | null) {
  let audioName = oldAudioUrl;
  const newAudioFile = formData.get('audio') as File;
  if (newAudioFile && (newAudioFile as any).size > 0) {
    audioName = await saveFile(newAudioFile, 'audio');
    if (oldAudioUrl) {
      try {
        if (typeof oldAudioUrl === 'string' && oldAudioUrl.startsWith('http')) {
          // attempt to derive key
          try { const u = new URL(oldAudioUrl); const p = u.pathname.replace(/^\//,''); await removeFileFromSupabase(p); } catch {}
        } else {
          try { await removeFileFromSupabase(`audio/${oldAudioUrl}`); } catch { try { await unlink(path.join(process.cwd(), UPLOAD_BASE_PATH, 'audio', oldAudioUrl)); } catch {} }
        }
      } catch {}
    }
  }
  return audioName;
}

export async function createProductFromForm(formData: FormData, producerId: string) {
  if (!producerId) {
    const err = new Error('MISSING_PRODUCER');
    (err as any).code = 'MISSING_PRODUCER';
    throw err;
  }

  const validation = await validateProductFormData(formData);
  const imageNames = await processProductImages(formData);
  const audioName = await processProductAudio(formData);

  // Determine subCategoryId from submitted form. The client uses `categoryId` for the selected subcategory id.
  const subCategoryId = String(formData.get('categoryId') || formData.get('subCategoryId') || validation.data.categoryId || '');

  const insertValues: any = {
    ...validation.data,
    images: imageNames,
    audioUrl: audioName,
    producerId,
    unit: validation.data.unit as any,
  };
  if (subCategoryId) insertValues.subCategoryId = subCategoryId;

  const [product] = await db.insert(schema.products).values(insertValues).returning();

  return product;
}

export async function updateProductFromForm(formData: FormData, actorProducerId?: string) {
  const productId = String(formData.get('id') || '');
  if (!productId) {
    const err = new Error('MISSING_ID');
    (err as any).code = 'MISSING_ID';
    throw err;
  }

  const oldProduct = await db.query.products.findFirst({ where: (p: any, { eq }: any) => eq(p.id, productId) } as any);
  if (!oldProduct) {
    const err = new Error('NOT_FOUND');
    (err as any).code = 'NOT_FOUND';
    throw err;
  }

  // Ownership check: if actorProducerId provided, ensure they own the product
  if (actorProducerId && oldProduct.producerId !== actorProducerId) {
    const err = new Error('FORBIDDEN');
    (err as any).code = 'FORBIDDEN';
    throw err;
  }

  const finalImages = await updateProductImages(formData, oldProduct.images);
  const audioName = await updateProductAudio(formData, oldProduct.audioUrl);
  const formDataValues = await validateProductUpdateFormData(formData);

  const [updated] = await db.update(schema.products).set({
    ...formDataValues,
    unit: formDataValues.unit as any,
    images: finalImages,
    audioUrl: audioName,
  }).where(eq(schema.products.id, productId)).returning();

  return updated;
}

export default {
  saveFile,
  createProductFromForm,
  updateProductFromForm,
};
