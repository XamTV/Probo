import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { config as loadEnv } from 'dotenv';
import { envFile } from '../src/common/monorepo-root';
import { PrismaClient } from '../src/generated/prisma/client';

// The monorepo has a single .env file, at the root. Loaded here too so the
// seed runs on its own, not only through the Prisma CLI.
loadEnv({ path: envFile(__dirname), quiet: true });

/**
 * Development accounts.
 *
 * There is no self-registration: POST /users needs a session, which needs an
 * account. Someone has to put the first administrator in the database, and
 * this is that someone — not a feature, a development tool.
 *
 * Two institutions on purpose. Tenant isolation (M-11, US-03) cannot be
 * demonstrated with a single one, and a demonstration that cannot fail proves
 * nothing to a jury.
 */
const PASSWORD = 'ProboDemo2026!';

const DATA = [
  {
    institution: { name: 'École Supérieure de Démonstration', siret: '90123456700017' },
    users: [
      { email: 'admin@probo.test', name: 'Camille Ferrand', role: 'ADMIN' },
      { email: 'charge@probo.test', name: 'Dominique Rey', role: 'ADMISSIONS_OFFICER' },
    ],
  },
  {
    institution: { name: 'Institut Voisin', siret: null },
    users: [{ email: 'admin@voisin.test', name: 'Alix Perrot', role: 'ADMIN' }],
  },
] as const;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The seed creates accounts with a published password. Not in production.');
  }

  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_URL is not set.');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    // Hashed once: argon2id is deliberately slow, and every account here
    // shares the same password anyway.
    const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

    for (const entry of DATA) {
      // The institution has no natural key, so an existing one is matched by
      // name. Re-running the seed must not pile up duplicates.
      const existing = await prisma.institution.findFirst({
        where: { name: entry.institution.name },
        select: { id: true },
      });

      const institution =
        existing ??
        (await prisma.institution.create({
          data: { name: entry.institution.name, siret: entry.institution.siret },
          select: { id: true },
        }));

      for (const user of entry.users) {
        await prisma.user.upsert({
          where: { email: user.email },
          // An account that was locked out by failed attempts is unlocked on
          // every run: being unable to sign in is exactly what this fixes.
          update: {
            passwordHash,
            isActive: true,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
          create: {
            institutionId: institution.id,
            email: user.email,
            name: user.name,
            role: user.role,
            passwordHash,
          },
        });

        console.log(`${user.email.padEnd(22)} ${user.role.padEnd(18)} ${entry.institution.name}`);
      }
    }

    console.log(`\nPassword for every account above: ${PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
