import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mime from 'mime-types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_SERVICE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.BUCKET_NAME || process.env.SUPABASE_BUCKET || 'ladini';
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. Aborting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) files.push(...await walk(full));
    else if (ent.isFile()) files.push(full);
  }
  return files;
}

async function uploadFile(filePath) {
  const rel = path.relative(UPLOADS_DIR, filePath).replace(/\\/g, '/');
  const remotePath = rel; // preserve folder structure under bucket
  const buffer = await fs.readFile(filePath);
  const contentType = mime.lookup(filePath) || undefined;

  try {
    const { error } = await supabase.storage.from(BUCKET).upload(remotePath, buffer, {
      contentType,
      upsert: false,
    });
    if (error) {
      // If already exists, try upsert
      if (error.message && error.message.includes('already exists')) {
        const { error: err2 } = await supabase.storage.from(BUCKET).upload(remotePath, buffer, { contentType, upsert: true });
        if (err2) throw err2;
      } else {
        throw error;
      }
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(remotePath);
    const publicUrl = publicData?.publicUrl || null;
    return { ok: true, remotePath, publicUrl };
  } catch (err) {
    return { ok: false, error: String(err), remotePath };
  }
}

async function main() {
  console.log('Scanning', UPLOADS_DIR);
  try {
    await fs.access(UPLOADS_DIR);
  } catch (e) {
    console.error('Uploads directory not found at', UPLOADS_DIR);
    process.exit(1);
  }

  const files = await walk(UPLOADS_DIR);
  console.log(`Found ${files.length} files.`);

  const map = {};
  const results = [];
  for (const f of files) {
    const rel = path.relative(process.cwd(), f);
    process.stdout.write(`Uploading ${rel} ... `);
    const r = await uploadFile(f);
    if (r.ok) {
      console.log('OK ->', r.publicUrl || r.remotePath);
      map[rel] = r.publicUrl || `supabase://${BUCKET}/${r.remotePath}`;
    } else {
      console.log('FAILED', r.error);
      map[rel] = { error: r.error };
    }
    results.push({ file: rel, ...r });
  }

  const outPath = path.join(process.cwd(), 'tmp_uploads_migration_map.json');
  await fs.writeFile(outPath, JSON.stringify({ createdAt: new Date().toISOString(), bucket: BUCKET, map, results }, null, 2), 'utf8');
  console.log('Migration map written to', outPath);

  console.log('Done. Review the map and optionally update DB records to point to public URLs.');
}

main().catch(err => { console.error('Migration failed', err); process.exit(1); });
