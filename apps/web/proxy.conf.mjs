import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The API port lives in the single .env at the workspace root. Copying the
// number here instead of reading it would make a changed port look like an
// API that stopped answering, with no message saying so.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const env = resolve(root, '.env');
if (existsSync(env)) process.loadEnvFile(env);

const port = process.env.API_PORT ?? 3000;

export default {
  '/api': {
    target: `http://localhost:${port}`,
    secure: false,
  },
};
