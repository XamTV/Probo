import { config as chargerEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';
import { resolve } from 'node:path';

// Le monorepo n'a qu'un seul fichier .env, à la racine.
chargerEnv({ path: resolve(__dirname, '../../.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
