#!/usr/bin/env node
const postgres = require('postgres');

async function main(){
  const url = process.env.DATABASE_URL;
  if(!url){
    console.error('DATABASE_URL not set');
    process.exit(2);
  }

  // Build ssl options consistent with src/db/index.ts
  const opts = { max: 1, connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT || 30) };
  if(process.env.DB_ALLOW_SELF_SIGNED === 'true'){
    opts.ssl = { rejectUnauthorized: false };
  }
  // If DB_SSL_CA or DB_SSL_CA_PATH provided, leave to underlying lib (postgres.js accepts ca via ssl.ca)
  if(process.env.DB_SSL_CA){
    try{
      const raw = process.env.DB_SSL_CA.trim();
      if(raw.includes('BEGIN CERT')){
        opts.ssl = { rejectUnauthorized: true, ca: raw };
      } else {
        const caPem = Buffer.from(raw, 'base64').toString('utf8');
        if(caPem.includes('BEGIN CERT')) opts.ssl = { rejectUnauthorized: true, ca: caPem };
      }
    }catch(e){ /* ignore */ }
  }

  const sql = postgres(url, opts);
  try{
    console.log('Connected, fetching schemas...');
    const rows = await sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast')`;
    for(const r of rows){
      const s = r.schema_name;
      console.log('Dropping schema (CASCADE):', s);
      try{
        await sql.unsafe(`DROP SCHEMA IF EXISTS "${s}" CASCADE`);
      }catch(e){
        console.error('Failed to drop', s, e.message || e);
      }
    }
    console.log('All drop attempts finished. Recreating public schema.');
    await sql`CREATE SCHEMA IF NOT EXISTS public`;
    console.log('Done.');
  }catch(e){
    console.error('Error during reset:', e);
    process.exit(1);
  }finally{
    await sql.end();
  }
}

main();
