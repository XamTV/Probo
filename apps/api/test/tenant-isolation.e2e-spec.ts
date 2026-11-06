import { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * US-03 — never see another institution's data.
 *
 * The criterion this file exists for: a request carrying another institution's
 * resource identifier returns **404, never 403**. A 403 would confirm the
 * resource exists, telling an attacker the identifier they guessed is real.
 *
 * It runs against the real database, because the isolation lives in the query
 * and a mocked Prisma would prove nothing about it.
 */
describe('US-03 — tenant isolation', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // getHttpServer() is typed `any`; naming it once keeps the lint rule happy
  // without scattering casts through the assertions.
  const serveur = (): Server => app.getHttpServer() as Server;

  const A = 'aaaaaaaa-0000-4000-8000-000000000001';
  const B = 'bbbbbbbb-0000-4000-8000-000000000002';
  const MOT_DE_PASSE = 'correct-horse-battery-staple';

  let adminA: { id: string; email: string };
  let adminB: { id: string; email: string };
  let chargeA: { id: string; email: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
    const auth = app.get(AuthService);
    const hash = await auth.hashPassword(MOT_DE_PASSE);

    await prisma.institution.deleteMany({ where: { id: { in: [A, B] } } });
    await prisma.institution.create({ data: { id: A, name: 'École A' } });
    await prisma.institution.create({ data: { id: B, name: 'École B' } });

    adminA = await prisma.user.create({
      data: {
        institutionId: A,
        email: 'admin-a@cloisonnement.test',
        name: 'Admin A',
        role: 'ADMIN',
        passwordHash: hash,
      },
      select: { id: true, email: true },
    });
    chargeA = await prisma.user.create({
      data: {
        institutionId: A,
        email: 'charge-a@cloisonnement.test',
        name: 'Chargé A',
        role: 'ADMISSIONS_OFFICER',
        passwordHash: hash,
      },
      select: { id: true, email: true },
    });
    adminB = await prisma.user.create({
      data: {
        institutionId: B,
        email: 'admin-b@cloisonnement.test',
        name: 'Admin B',
        role: 'ADMIN',
        passwordHash: hash,
      },
      select: { id: true, email: true },
    });
  });

  afterAll(async () => {
    await prisma.institution.deleteMany({ where: { id: { in: [A, B] } } });
    await app.close();
  });

  const connexion = async (email: string): Promise<string> => {
    const res = await request(serveur())
      .post('/api/auth/login')
      .send({ email, password: MOT_DE_PASSE })
      .expect(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    return cookies.find((c) => c.startsWith('probo_session='))!;
  };

  it('returns 404 — never 403 — for a user of another institution', async () => {
    const cookie = await connexion(adminA.email);

    await request(serveur()).get(`/api/users/${adminB.id}`).set('Cookie', cookie).expect(404);
  });

  it('returns the user when they belong to the caller institution', async () => {
    const cookie = await connexion(adminA.email);

    await request(serveur()).get(`/api/users/${adminA.id}`).set('Cookie', cookie).expect(200);
  });

  it('lists only the caller institution accounts', async () => {
    const cookie = await connexion(adminA.email);

    const res = await request(serveur()).get('/api/users').set('Cookie', cookie).expect(200);

    const emails = (res.body as { email: string }[]).map((u) => u.email);
    expect(emails).toContain(adminA.email);
    expect(emails).not.toContain(adminB.email);
  });

  it('creates an account in the caller institution, whatever the payload says', async () => {
    const cookie = await connexion(adminA.email);

    const res = await request(serveur())
      .post('/api/users')
      .set('Cookie', cookie)
      .send({
        email: 'nouvelle@cloisonnement.test',
        name: 'Nouvelle',
        role: 'ADMISSIONS_OFFICER',
        institutionId: B, // forged: must be ignored, not honoured
      })
      .expect(201);

    const created = await prisma.user.findUnique({
      where: { id: (res.body as { id: string }).id },
      select: { institutionId: true },
    });
    expect(created?.institutionId).toBe(A);
  });

  describe('US-02 — an admissions officer manages no account', () => {
    it('refuses the listing with 403, not 404', async () => {
      const cookie = await connexion(chargeA.email);

      // 403 and not 404 here, deliberately: the caller is identified and the
      // resource belongs to their own institution. Its existence is no secret;
      // only the permission is. US-03's "404, never 403" covers another
      // institution's data, which is a different question.
      await request(serveur()).get('/api/users').set('Cookie', cookie).expect(403);
    });

    it('refuses creating an account', async () => {
      const cookie = await connexion(chargeA.email);

      await request(serveur())
        .post('/api/users')
        .set('Cookie', cookie)
        .send({ email: 'x@cloisonnement.test', name: 'X', role: 'ADMISSIONS_OFFICER' })
        .expect(403);
    });

    it('refuses changing an account, including their own', async () => {
      const cookie = await connexion(chargeA.email);

      await request(serveur())
        .patch(`/api/users/${chargeA.id}`)
        .set('Cookie', cookie)
        .send({ role: 'ADMIN' })
        .expect(403);
    });

    it('still signs in and reads its own session', async () => {
      const cookie = await connexion(chargeA.email);

      const res = await request(serveur()).get('/api/auth/me').set('Cookie', cookie).expect(200);
      expect((res.body as { role: string }).role).toBe('ADMISSIONS_OFFICER');
    });
  });

  /**
   * The failed sign-in has to land in the right tenant's audit trail, and the
   * unknown address has to land nowhere. Nothing covered this until the class
   * diagram showed the controller reaching into Prisma to work the tenant out
   * for itself — the lookup moved into `AuthService.auditTargetFor`, and these
   * two cases are what keeps it honest.
   */
  describe('US-01 — a failed sign-in is audited under its own institution', () => {
    const compte = async (email: string): Promise<void> => {
      await request(serveur())
        .post('/api/auth/login')
        .send({ email, password: 'wrong-password-entirely' })
        .expect(401);
    };

    it('records the failure against the institution of the targeted account', async () => {
      const avant = new Date();
      await compte(adminB.email);

      const entrees = await prisma.auditEntry.findMany({
        where: { action: 'USER_LOGIN_FAILED', entityId: adminB.id, occurredAt: { gte: avant } },
        select: { institutionId: true },
      });

      expect(entrees).toHaveLength(1);
      // B and not A: the entry belongs to the tenant that owns the account.
      expect(entrees[0]?.institutionId).toBe(B);
    });

    it('records nothing for an address no account carries', async () => {
      const avant = new Date();
      await compte('personne@cloisonnement.test');

      const entrees = await prisma.auditEntry.count({
        where: { action: 'USER_LOGIN_FAILED', occurredAt: { gte: avant } },
      });

      // No account means no tenant the entry could belong to. The lockout
      // counter carries what is left, which is nothing here.
      expect(entrees).toBe(0);
    });
  });

  it('refuses an unauthenticated caller', async () => {
    await request(serveur()).get('/api/users').expect(401);
  });

  it('keeps the health probe public', async () => {
    await request(serveur()).get('/api/health').expect(200);
  });
});
