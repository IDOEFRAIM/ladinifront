// Vercel refuse les corps de requête > 4,5 Mo : on recompresse toujours l'image
// côté client (JPEG, 1600 px max) — une photo de téléphone tombe à ~300-800 Ko.
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export const MAX_DIMENSION = 1600;

export const MAX_UPLOAD_BASE64_CHARS = 4 * 1024 * 1024;

export async function compressToJpegBase64(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // HEIC/HEIF (iPhone) non décodable par ce navigateur, ou fichier corrompu.
    throw new Error("Format d'image non pris en charge. Utilisez une photo JPEG, PNG ou WebP.");
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Impossible de traiter l'image sur cet appareil.");
  ctx.fillStyle = '#fff'; // PNG transparents → fond blanc en JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  for (const quality of [0.85, 0.7, 0.5]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1); // retire "data:image/jpeg;base64,"
    if (base64.length <= MAX_UPLOAD_BASE64_CHARS) return base64;
  }
  throw new Error('Image trop volumineuse.');
}
