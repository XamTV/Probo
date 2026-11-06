import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Lot 2 — US-04, US-05, US-06 and US-22.
 *
 * Against the real database, for the same reason the isolation suite is: RG-08
 * is held by a CHECK constraint the application cannot see, and a mocked
 * Prisma would accept exactly what Postgres refuses.
 */
describe('Lot 2 — campaign and comparison reference', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const serveur = (): Server => app.getHttpServer() as Server;

  const A = 'aaaaaaaa-0000-4000-8000-000000000011';
  const B = 'bbbbbbbb-0000-4000-8000-000000000012';
  const MOT_DE_PASSE = 'correct-horse-battery-staple';
  const PROFIL = 'Profil recherché : trois ans d expérience en développement web, autonomie.';

  let adminA: { email: string };
  let chargeA: { email: string };
  let adminB: { email: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
    const hash = await app.get(AuthService).hashPassword(MOT_DE_PASSE);

    await prisma.institution.deleteMany({ where: { id: { in: [A, B] } } });
    await prisma.institution.create({ data: { id: A, name: 'École A' } });
    await prisma.institution.create({ data: { id: B, name: 'École B' } });

    const compte = (institutionId: string, email: string, role: 'ADMIN' | 'ADMISSIONS_OFFICER') =>
      prisma.user.create({
        data: { institutionId, email, name: email, role, passwordHash: hash },
        select: { email: true },
      });

    adminA = await compte(A, 'admin-a@campagne.test', 'ADMIN');
    chargeA = await compte(A, 'charge-a@campagne.test', 'ADMISSIONS_OFFICER');
    adminB = await compte(B, 'admin-b@campagne.test', 'ADMIN');
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

  const creer = async (cookie: string, name = 'Mastère 2027'): Promise<string> => {
    const res = await request(serveur())
      .post('/api/campaigns')
      .set('Cookie', cookie)
      .send({ name })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  describe('US-04 — creating a campaign', () => {
    it('creates it as a draft, with no expected type', async () => {
      const cookie = await connexion(adminA.email);

      const res = await request(serveur())
        .post('/api/campaigns')
        .set('Cookie', cookie)
        .send({ name: 'Licence 2027' })
        .expect(201);

      const body = res.body as { status: string; expectedTypes: string[] };
      expect(body.status).toBe('DRAFT');
      // Nothing is guessed on the institution's behalf: US-05 asks for the
      // types explicitly, and activation is what enforces it.
      expect(body.expectedTypes).toEqual([]);
    });

    it('refuses a window that closes before it opens', async () => {
      const cookie = await connexion(adminA.email);

      await request(serveur())
        .post('/api/campaigns')
        .set('Cookie', cookie)
        .send({ name: 'Licence 2027', opensAt: '2027-03-01', closesAt: '2027-02-01' })
        .expect(400);
    });
  });

  describe('US-03 — a campaign never crosses its institution', () => {
    it('returns 404 — never 403 — for another institution campaign', async () => {
      const id = await creer(await connexion(adminB.email));

      await request(serveur())
        .get(`/api/campaigns/${id}`)
        .set('Cookie', await connexion(adminA.email))
        .expect(404);
    });

    it('lists only the caller institution campaigns', async () => {
      const cookieB = await connexion(adminB.email);
      const idB = await creer(cookieB, 'Campagne de B');

      const res = await request(serveur())
        .get('/api/campaigns')
        .set('Cookie', await connexion(adminA.email))
        .expect(200);

      const ids = (res.body as { id: string }[]).map((c) => c.id);
      expect(ids).not.toContain(idB);
    });
  });

  describe('US-02 — an admissions officer reads but never configures', () => {
    it('lets them read the campaign they will import into', async () => {
      const id = await creer(await connexion(adminA.email));

      await request(serveur())
        .get(`/api/campaigns/${id}`)
        .set('Cookie', await connexion(chargeA.email))
        .expect(200);
    });

    it('refuses them the creation with 403, not 404', async () => {
      // The campaign belongs to their own institution: its existence is no
      // secret, only the permission is.
      await request(serveur())
        .post('/api/campaigns')
        .set('Cookie', await connexion(chargeA.email))
        .send({ name: 'Tentative' })
        .expect(403);
    });

    it('refuses them the settings and the activation', async () => {
      const id = await creer(await connexion(adminA.email));
      const cookie = await connexion(chargeA.email);

      await request(serveur())
        .patch(`/api/campaigns/${id}`)
        .set('Cookie', cookie)
        .send({ confidenceThreshold: 50 })
        .expect(403);

      await request(serveur())
        .post(`/api/campaigns/${id}/activation`)
        .set('Cookie', cookie)
        .expect(403);
    });
  });

  describe('US-06 — threshold and weighting', () => {
    it('accepts weights that do not add up to 1 (RG-05)', async () => {
      const cookie = await connexion(adminA.email);
      const id = await creer(cookie);

      await request(serveur())
        .patch(`/api/campaigns/${id}`)
        .set('Cookie', cookie)
        .send({ weighting: { relevance: 1, clarity: 1, formalQuality: 1 } })
        .expect(200);
    });

    it('refuses a weighting that is entirely zero', async () => {
      const cookie = await connexion(adminA.email);
      const id = await creer(cookie);

      await request(serveur())
        .patch(`/api/campaigns/${id}`)
        .set('Cookie', cookie)
        .send({ weighting: { relevance: 0, clarity: 0, formalQuality: 0 } })
        .expect(400);
    });
  });

  describe('US-22, RG-08 — the comparison reference gates activation', () => {
    it('refuses to activate a campaign with no expected type', async () => {
      const cookie = await connexion(adminA.email);
      const id = await creer(cookie);

      const res = await request(serveur())
        .post(`/api/campaigns/${id}/activation`)
        .set('Cookie', cookie)
        .expect(400);

      expect((res.body as { blockers: string[] }).blockers).toContain('NO_EXPECTED_TYPE');
    });

    it('refuses to activate while an expected type has no reference', async () => {
      const cookie = await connexion(adminA.email);
      const id = await creer(cookie);

      await request(serveur())
        .patch(`/api/campaigns/${id}`)
        .set('Cookie', cookie)
        .send({ expectedTypes: ['RESUME', 'COVER_LETTER'] })
        .expect(200);

      await request(serveur())
        .put(`/api/campaigns/${id}/references`)
        .set('Cookie', cookie)
        .send({ form: 'TEXT', documentType: 'RESUME', text: PROFIL })
        .expect(200);

      const res = await request(serveur())
        .post(`/api/campaigns/${id}/activation`)
        .set('Cookie', cookie)
        .expect(400);

      expect((res.body as { blockers: string[] }).blockers).toContain('MISSING_REFERENCE_PROFILE');
    });

    it('activates the campaign once every expected type has one', async () => {
      const cookie = await connexion(adminA.email);
      const id = await creer(cookie);

      await request(serveur())
        .patch(`/api/campaigns/${id}`)
        .set('Cookie', cookie)
        .send({ expectedTypes: ['RESUME'] })
        .expect(200);

      await request(serveur())
        .put(`/api/campaigns/${id}/references`)
        .set('Cookie', cookie)
        .send({ form: 'TEXT', documentType: 'RESUME', text: PROFIL })
        .expect(200);

      const res = await request(serveur())
        .post(`/api/campaigns/${id}/activation`)
        .set('Cookie', cookie)
        .expect(201);

      expect((res.body as { status: string }).status).toBe('ACTIVE');
    });

    it('keeps a single reference per type, however many times it is sent', async () => {
      const cookie = await connexion(adminA.email);
      const id = await creer(cookie);

      for (const text of [PROFIL, `${PROFIL} Version revue.`]) {
        await request(serveur())
          .put(`/api/campaigns/${id}/references`)
          .set('Cookie', cookie)
          .send({ form: 'TEXT', documentType: 'RESUME', text })
          .expect(200);
      }

      const profils = await prisma.referenceProfile.findMany({
        where: { campaignId: id, documentType: 'RESUME' },
      });

      expect(profils).toHaveLength(1);
      expect(profils[0]?.text).toContain('Version revue');
    });

    it('refuses the uploaded-document form, which does not exist yet', async () => {
      const cookie = await connexion(adminA.email);
      const id = await creer(cookie);

      // US-22 asks for two forms. The API serves one: refusing an unreadable
      // reference needs the lot 4 extraction chain, and accepting a caller
      // supplied `storageKey` until then would store a pointer to a file
      // nobody ever wrote.
      await request(serveur())
        .put(`/api/campaigns/${id}/references`)
        .set('Cookie', cookie)
        .send({
          form: 'FILE',
          documentType: 'RESUME',
          fileName: 'profil-recherche.pdf',
          storageKey: 'reference/abc123.pdf',
        })
        .expect(400);
    });

    it('refuses a reference carrying both forms', async () => {
      const cookie = await connexion(adminA.email);
      const id = await creer(cookie);

      await request(serveur())
        .put(`/api/campaigns/${id}/references`)
        .set('Cookie', cookie)
        .send({
          form: 'TEXT',
          documentType: 'RESUME',
          text: PROFIL,
          fileName: 'profil-recherche.pdf',
          storageKey: 'reference/abc123.pdf',
        })
        .expect(400);
    });
  });
});
