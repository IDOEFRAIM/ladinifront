import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  
  // Allow opting out of TLS certificate verification for development
  // when connecting to databases with self-signed certificates.
  // Set `DB_ALLOW_SELF_SIGNED=true` in your environment to enable.
  const allowSelfSigned = process.env.DB_ALLOW_SELF_SIGNED === 'true';
  const poolConfig: any = { connectionString };
  if (allowSelfSigned) {
    // Also disable Node-level TLS certificate validation for development
    // to ensure the pg Pool accepts self-signed certificates when needed.
    // This is a dev-only escape hatch; do NOT enable in production.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    poolConfig.ssl = { rejectUnauthorized: false };
  }
  const pool = new Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClientSingleton | undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}