// Génère les migrations SQL à partir du schéma TypeScript (npm run db:generate).
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: '../../database/migrations',
});
