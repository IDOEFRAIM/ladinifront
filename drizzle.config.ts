import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Multi-schema support
  // Exclude 'auth' from management to avoid conflict with Supabase Auth
  schemaFilter: ['governance', 'marketplace', 'intelligence', 'public'],
  verbose: true,
  strict: true,
});
