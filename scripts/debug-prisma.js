const { PrismaClient } = require('../generated/prisma');

// Create adapter + pool at runtime to match app behavior
const connectionString = process.env.DATABASE_URL;
let prisma;
if (connectionString) {
  let adapter;
  try {
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 10 });
    adapter = new PrismaPg(pool);
  } catch (e) {
    // adapter not available: fall back to default PrismaClient
    console.warn('@prisma/adapter-pg not available, falling back to default PrismaClient');
  }
  prisma = adapter ? new PrismaClient({ adapter, log: ['error'] }) : new PrismaClient({});
} else {
  prisma = new PrismaClient({});
}

async function main() {
  try {
    console.log('Running prisma.zone.findMany test...');
    const zones = await prisma.zone.findMany({ select: { id: true, name: true, code: true } });
    console.log('Zones:', zones.length);
  } catch (e) {
    console.error('Prisma error:');
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
