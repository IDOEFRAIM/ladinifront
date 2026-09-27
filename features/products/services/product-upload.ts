import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { uploadBufferToSupabase } from '@/lib/supabase.server';
import { asError, codedError } from '@/lib/errors';

export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.webm'];

export const UPLOAD_BASE_PATH = process.env.UPLOADS_DIR || 'public/uploads';

export const MAX_IMAGES = 5;

export function getFileExtension(file: File): string {
  const originalExt = path.extname(file.name || '').toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(originalExt)) {
    return originalExt;
  }
  if (file.type === 'audio/webm') {
    return '.webm';
  }
  return '.jpg';
}

export function generateFileName(extension: string): string {
  const uniqueId = Math.random().toString(36).substring(2, 10);
  return `${Date.now()}-${uniqueId}${extension}`;
}

export async function saveFile(file: File, folder: string) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = getFileExtension(file);
  const fileName = generateFileName(extension);
  try {
    // Try uploading to Supabase first
    try {
      const remotePath = `${folder}/${fileName}`;
      const publicUrl = await uploadBufferToSupabase(remotePath, buffer, file.type || undefined);
      if (publicUrl) return publicUrl;
    } catch (e) {
      console.warn('Supabase upload failed for saveFile, falling back to local FS', e);
    }

    // Fallback to local filesystem
    const uploadDir = path.join(process.cwd(), UPLOAD_BASE_PATH, folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);
    return fileName;
  } catch (_err: unknown) {
    const err = asError(_err);
    if (err?.code === 'EROFS' || err?.code === 'EACCES') {
      throw codedError('READ_ONLY_FS', 'Server filesystem is read-only. Configure UPLOADS_DIR or external storage.');
    }
    throw err;
  }
}
