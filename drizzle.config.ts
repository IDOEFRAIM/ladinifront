import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Multi-schema support
  schemaFilter: ['auth', 'governance', 'marketplace', 'intelligence', 'public'],
  verbose: true,
  strict: true,
});
