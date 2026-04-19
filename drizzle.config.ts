import { defineConfig } from 'drizzle-kit';

// Use only environment variables for SSL/CA configuration.
// - `DATABASE_URL` must be set.
// - Optional: `DATABASE_SSL_CA` contains the PEM CA content.
// - Optional: `NODE_EXTRA_CA_CERTS` can point to a CA file path.
// - Optional: `DISABLE_SSLMODE` when set to 'true' will append sslmode=disable to the URL.

const rawUrl = process.env.DATABASE_URL || '';
function buildDbUrlFromEnv() {
  if (!rawUrl) return rawUrl;
  if (process.env.DISABLE_SSLMODE === 'true') {
    if (rawUrl.includes('sslmode=')) return rawUrl;
    return rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'sslmode=disable';
  }
  return rawUrl;
}

const dbUrl = buildDbUrlFromEnv();

let ssl: any = undefined;
if (process.env.DATABASE_SSL_CA) {
  ssl = { rejectUnauthorized: true, ca: process.env.DATABASE_SSL_CA };
  // If user provided a path via NODE_EXTRA_CA_CERTS, prefer it; otherwise leave as-is.
  if (process.env.NODE_EXTRA_CA_CERTS) {
    try { process.env.NODE_EXTRA_CA_CERTS = process.env.NODE_EXTRA_CA_CERTS; } catch (e) { /* ignore */ }
  }
}

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl || process.env.DATABASE_URL!,
    ...(ssl ? { ssl } : {}),
  },
  // Multi-schema support
  // Exclude 'auth' from management to avoid conflict with Supabase Auth
 
  schemaFilter: ['governance', 'marketplace', 'intelligence', 'public'],
  verbose: true,
  strict: true,
});
