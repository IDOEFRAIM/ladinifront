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
// Support CA via inline env, or via a file path, and allow opt-in self-signed acceptance.
// Accept both DATABASE_SSL_* and DB_SSL_* prefixes to match runtime db client.
if (
  process.env.DATABASE_SSL_CA ||
  process.env.DATABASE_SSL_CA_PATH ||
  process.env.DB_SSL_CA ||
  process.env.DB_SSL_CA_PATH ||
  process.env.DB_ALLOW_SELF_SIGNED
) {
  const allowSelfSigned =
    process.env.DB_ALLOW_SELF_SIGNED === '1' ||
    String(process.env.DB_ALLOW_SELF_SIGNED).toLowerCase() === 'true';

  let caValue: string | undefined = undefined;
  if (process.env.DATABASE_SSL_CA || process.env.DB_SSL_CA) caValue = process.env.DATABASE_SSL_CA || process.env.DB_SSL_CA;
  else if (process.env.DATABASE_SSL_CA_PATH || process.env.DB_SSL_CA_PATH) {
    try {
      // lazy require fs to avoid issues in some environments
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      const p = process.env.DATABASE_SSL_CA_PATH || process.env.DB_SSL_CA_PATH;
      caValue = fs.readFileSync(p, 'utf8');
    } catch (e) {
      console.warn('Failed to read SSL CA path', process.env.DATABASE_SSL_CA_PATH || process.env.DB_SSL_CA_PATH, e);
    }
  }

  ssl = { rejectUnauthorized: !allowSelfSigned } as any;
  if (caValue) ssl.ca = caValue;

  // If explicitly allowing self-signed certs, also set Node TLS env to accept them
  if (allowSelfSigned) {
    try {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    } catch (e) {
      /* ignore */
    }
  }

  // If NODE_EXTRA_CA_CERTS is provided, it will be used by Node's TLS stack automatically.
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
