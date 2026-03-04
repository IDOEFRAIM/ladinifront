#!/usr/bin/env node
const postgres = require('postgres');

async function main(){
  const url = process.env.DATABASE_URL;
  if(!url){
    console.error('DATABASE_URL not set');
    process.exit(2);
  }
  const opts = { max:1, connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT || 30) };
  if(process.env.DB_ALLOW_SELF_SIGNED === 'true') opts.ssl = { rejectUnauthorized: false };
  if(process.env.DB_SSL_CA){
    try{
      const raw = process.env.DB_SSL_CA.trim();
      if(raw.includes('BEGIN CERT')) opts.ssl = { rejectUnauthorized: true, ca: raw };
      else { const caPem = Buffer.from(raw, 'base64').toString('utf8'); if(caPem.includes('BEGIN CERT')) opts.ssl = { rejectUnauthorized: true, ca: caPem }; }
    }catch(e){}
  }
  const sql = postgres(url, opts);
  try{
    console.log('Creating schemas: governance, marketplace, intelligence, public');
    await sql`CREATE SCHEMA IF NOT EXISTS governance`;
    await sql`CREATE SCHEMA IF NOT EXISTS marketplace`;
    await sql`CREATE SCHEMA IF NOT EXISTS intelligence`;
    await sql`CREATE SCHEMA IF NOT EXISTS public`;
    console.log('Schemas ensured.');
  }catch(e){
    console.error('Error creating schemas', e);
    process.exit(1);
  }finally{ await sql.end(); }
}

main();
