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

// Default: accept self-signed certs (DigitalOcean managed DB)
let ssl: any = { rejectUnauthorized: false };

// Override with explicit CA if provided
try {
  let caValue: string | undefined = undefined;
  if (process.env.DATABASE_SSL_CA || process.env.DB_SSL_CA) {
    caValue = process.env.DATABASE_SSL_CA || process.env.DB_SSL_CA;
  } else if (process.env.DATABASE_SSL_CA_PATH || process.env.DB_SSL_CA_PATH) {
    const fs = require('fs');
    const p = process.env.DATABASE_SSL_CA_PATH || process.env.DB_SSL_CA_PATH;
    caValue = fs.readFileSync(p, 'utf8');
  }
  if (caValue) ssl.ca = caValue;
} catch (e) {
  console.warn('drizzle.config: SSL CA setup failed, using rejectUnauthorized=false', e);
}

if (process.env.DISABLE_SSLMODE === 'true') {
  ssl = undefined;
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
