import { codedError } from '@/lib/errors';
import { unlink } from 'fs/promises';
import path from 'path';
import { removeFileFromSupabase } from '@/lib/supabase.server';
import { UPLOAD_BASE_PATH, MAX_IMAGES, saveFile } from '@/features/products/services/product-upload';

export async function processProductImages(formData: FormData) {
  const imageFiles = (formData.getAll('images') as File[]).filter(f => f && f.size > 0);
  if (imageFiles.length > MAX_IMAGES) {
    throw codedError('TOO_MANY_IMAGES');
  }
  return await Promise.all(imageFiles.map(f => saveFile(f, 'products')));
}

export async function processProductAudio(formData: FormData) {
  const audioFile = formData.get('audio') as File;
  if (audioFile && audioFile.size > 0) {
    return await saveFile(audioFile, 'audio');
  }
  return null;
}

export async function updateProductImages(formData: FormData, oldImages: string[]) {
  let existingImages: string[] = [];
  try { existingImages = JSON.parse(String(formData.get('existingImages') || '[]')); } catch { existingImages = oldImages || []; }

  const newFiles = (formData.getAll('images') as File[]).filter(f => f && f.size > 0);
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

export async function updateProductAudio(formData: FormData, oldAudioUrl: string | null) {
  let audioName = oldAudioUrl;
  const newAudioFile = formData.get('audio') as File;
  if (newAudioFile && newAudioFile.size > 0) {
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
