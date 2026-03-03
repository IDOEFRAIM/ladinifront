import { defineConfig } from '@prisma/config'
import * as dotenv from 'dotenv'

// Charge explicitement les variables du fichier .env
dotenv.config()

export default defineConfig({
  datasource: {
    // On donne la priorité à DIRECT_URL pour les opérations CLI (db push)
    url: process.env.DATABASE_URL || '',
  },
})