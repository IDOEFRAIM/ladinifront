import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.BUCKET_NAME || 'ladini';

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Supabase not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  // Validate SUPABASE_URL is a proper HTTP/HTTPS URL to avoid cryptic errors from the client
  try {
    const u = new URL(SUPABASE_URL);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error('SUPABASE_URL must use http or https protocol');
    }
  } catch (err) {
    // Common misconfiguration: using the Postgres DATABASE_URL instead of the Supabase project URL
    const val = String(SUPABASE_URL || '');
    if (val.startsWith('postgres://') || val.startsWith('postgresql://')) {
      throw new Error(
        `SUPABASE_URL appears to be a Postgres connection string (DATABASE_URL). ` +
        `You must set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL / SUPABASE_PROJECT_URL) to your Supabase HTTP URL, for example: https://your-project-ref.supabase.co. ` +
        `Do NOT use the Postgres connection string (postgresql://...). Current value: '${val.slice(0, 80)}...'`
      );
    }

    throw new Error(`Invalid SUPABASE_URL environment variable: '${val}'. It must be a valid http(s) URL.`);
  }

  // Create client lazily to avoid running in browser bundles or at module-eval time
  try {
    _supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    return _supabaseAdmin;
  } catch (err: any) {
    // Provide a clearer error message for common misconfigurations
    console.error('Failed to create Supabase client:', err?.message || err);
    throw new Error('Failed to initialize Supabase client. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
}

export async function uploadBufferToSupabase(path: string, buffer: Buffer, contentType?: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const maxAttempts = 3;
  let lastErr: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
        contentType: contentType || undefined,
        upsert: false,
      });
      if (error) throw error;

      const { data: publicData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      return publicData?.publicUrl || null;
    } catch (err: any) {
      lastErr = err;
      const code = err?.code || err?.status || err?.statusCode || 'unknown';
      console.warn(`[supabase] upload attempt ${attempt}/${maxAttempts} failed for ${path} — code=${code}`, err?.message || err);
      // Short exponential backoff
      if (attempt < maxAttempts) {
        const delayMs = 200 * Math.pow(2, attempt - 1);
        await new Promise(res => setTimeout(res, delayMs));
        continue;
      }
    }
  }

  // All attempts failed — throw with enriched information
  const enriched = new Error(`Supabase upload failed for ${path} after ${maxAttempts} attempts: ${lastErr?.message || lastErr}`);
  // attach original error for callers
  (enriched as any).original = lastErr;
  throw enriched;
}

export async function removeFileFromSupabase(path: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const maxAttempts = 3;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
      if (error) throw error;
      return true;
    } catch (err: any) {
      lastErr = err;
      console.warn(`[supabase] remove attempt ${attempt}/${maxAttempts} failed for ${path}`, err?.message || err);
      if (attempt < maxAttempts) {
        const delayMs = 200 * Math.pow(2, attempt - 1);
        await new Promise(res => setTimeout(res, delayMs));
        continue;
      }
    }
  }
  console.warn('Supabase remove failed after retries for', path, lastErr);
  return false;
}

export default getSupabaseAdmin;
