import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';
import { resolve } from 'node:path';

// The monorepo has a single .env file, at the root.
loadEnv({ path: resolve(__dirname, '../../.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --compiler-options {"module":"commonjs"} prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
