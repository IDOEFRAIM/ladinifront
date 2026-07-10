import { defineConfig } from 'drizzle-kit';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Charge le fichier .env pour que drizzle-kit y ait accès en ligne de commande
dotenv.config();

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

// Configuration SSL de repli par défaut (Accepte les certificats auto-signés)
let ssl: any = { rejectUnauthorized: false };

try {
  let caValue: string | undefined = undefined;
  const caEnv = process.env.DATABASE_SSL_CA || process.env.DB_SSL_CA;
  const caPathEnv = process.env.DATABASE_SSL_CA_PATH || process.env.DB_SSL_CA_PATH;

  if (caEnv) {
    caValue = caEnv;
  } else if (caPathEnv) {
    const resolvedPath = path.resolve(caPathEnv);
    if (fs.existsSync(resolvedPath)) {
      caValue = fs.readFileSync(resolvedPath, 'utf8');
    }
  }
  
  if (caValue) {
    ssl = { rejectUnauthorized: true, ca: caValue };
  }
} catch (e) {
  console.warn('drizzle.config: SSL CA setup failed, falling back to rejectUnauthorized=false', e);
  ssl = { rejectUnauthorized: false };
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
  
  // 💡 MIS À JOUR : Ajout de 'auth' et inclusion automatique de tous tes schémas métiers
  schemaFilter: ['public', 'auth', 'governance', 'marketplace', 'intelligence'],
  
  verbose: true,
  strict: true,
});