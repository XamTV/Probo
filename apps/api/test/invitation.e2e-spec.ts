import { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * US-02 — the invitation link, which is what makes an account usable.
 *
 * Probo sends no email: creating an account produces a link the administrator
 * passes on themselves. The point of the whole flow is that the administrator
 * never knows the password — without that, the audit trail stops proving who
 * acted.
 *
 * Against the real database: the link lives in two columns on `user` rather
 * than in a table of its own (journal, 2026-11-02), and what is worth testing
 * is precisely that the row holds no clear token and no password.
 */
describe('US-02 — the invitation link', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: AuthService;

  const server = (): Server => app.getHttpServer() as Server;

  const INSTITUTION = 'cccccccc-0000-4000-8000-000000000003';
  const ADMIN_PASSWORD = 'correct-horse-battery-staple';
  const CHOSEN_PASSWORD = 'quatorze-chevaux-sauvages';

  let admin: { id: string; email: string };
  let cookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
    auth = app.get(AuthService);

    await prisma.institution.deleteMany({ where: { id: INSTITUTION } });
    await prisma.institution.create({ data: { id: INSTITUTION, name: 'École invitante' } });

    admin = await prisma.user.create({
      data: {
        institutionId: INSTITUTION,
        email: 'admin@invitation.test',
        name: 'Admin',
        role: 'ADMIN',
        passwordHash: await auth.hashPassword(ADMIN_PASSWORD),
      },
      select: { id: true, email: true },
    });

    const res = await request(server())
      .post('/api/auth/login')
      .send({ email: admin.email, password: ADMIN_PASSWORD })
      .expect(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    cookie = cookies.find((c) => c.startsWith('probo_session='))!;
  });

  afterAll(async () => {
    await prisma.institution.deleteMany({ where: { id: INSTITUTION } });
    await app.close();
  });

  // Unique per run: a run that crashes before `afterAll` leaves its rows
  // behind, and a fixed address would then collide with itself.
  const RUN = Date.now().toString(36);
  let created = 0;
  const invite = async (): Promise<{
    id: string;
    email: string;
    token: string;
    state: string;
  }> => {
    created += 1;
    const email = `invited-${RUN}-${created}@invitation.test`;
    const res = await request(server())
      .post('/api/users')
      .set('Cookie', cookie)
      .send({ email, name: `Invited ${created}`, role: 'ADMISSIONS_OFFICER' })
      .expect(201);
    const body = res.body as { id: string; invitationToken: string; state: string };
    return { id: body.id, email, token: body.invitationToken, state: body.state };
  };

  describe('creating an account', () => {
    it('hands back a link and stores no password at all', async () => {
      const account = await invite();

      expect(account.token).toHaveLength(43);
      expect(account.state).toBe('INVITED');

      const row = await prisma.user.findUniqueOrThrow({ where: { id: account.id } });
      expect(row.passwordHash).toBeNull();
      // The clear token is returned once and never stored.
      expect(row.invitationTokenHash).not.toBe(account.token);
      expect(row.invitationExpiresAt).not.toBeNull();
    });

    it('expires the link seven days out', async () => {
      const account = await invite();
      const row = await prisma.user.findUniqueOrThrow({ where: { id: account.id } });

      const days = (row.invitationExpiresAt!.getTime() - Date.now()) / (24 * 60 * 60_000);
      expect(days).toBeGreaterThan(6.9);
      expect(days).toBeLessThan(7.1);
    });

    it('shows the account as invited until its owner acts', async () => {
      const account = await invite();

      const res = await request(server()).get('/api/users').set('Cookie', cookie).expect(200);
      const listed = (res.body as { id: string; state: string; passwordHash?: string }[]).find(
        (u) => u.id === account.id,
      );

      expect(listed?.state).toBe('INVITED');
      expect(listed?.passwordHash).toBeUndefined();
    });

    it('refuses to let an invited account sign in', async () => {
      const account = await invite();

      await request(server())
        .post('/api/auth/login')
        .send({ email: account.email, password: CHOSEN_PASSWORD })
        .expect(401);
    });
  });

  describe('setting a password', () => {
    it('lets the owner choose their own, then sign in with it', async () => {
      const account = await invite();

      await request(server())
        .post('/api/auth/invitation')
        .send({ token: account.token, password: CHOSEN_PASSWORD })
        .expect(200)
        .expect((res) => expect((res.body as { email: string }).email).toBe(account.email));

      await request(server())
        .post('/api/auth/login')
        .send({ email: account.email, password: CHOSEN_PASSWORD })
        .expect(200);
    });

    it('spends the link: the same one never works twice', async () => {
      const account = await invite();

      await request(server())
        .post('/api/auth/invitation')
        .send({ token: account.token, password: CHOSEN_PASSWORD })
        .expect(200);

      await request(server())
        .post('/api/auth/invitation')
        .send({ token: account.token, password: 'another-long-password' })
        .expect(401);
    });

    it('refuses a password under twelve characters', async () => {
      const account = await invite();

      await request(server())
        .post('/api/auth/invitation')
        .send({ token: account.token, password: 'court' })
        .expect(400);
    });

    it('refuses a token nobody was ever given', async () => {
      await request(server())
        .post('/api/auth/invitation')
        .send({ token: 'z'.repeat(43), password: CHOSEN_PASSWORD })
        .expect(401);
    });

    it('refuses an expired link, and says no more than that', async () => {
      const account = await invite();
      await prisma.user.update({
        where: { id: account.id },
        data: { invitationExpiresAt: new Date(Date.now() - 60_000) },
      });

      await request(server())
        .post('/api/auth/invitation')
        .send({ token: account.token, password: CHOSEN_PASSWORD })
        .expect(401);
    });
  });

  describe('issuing a new link', () => {
    it('kills the previous one at that instant', async () => {
      const account = await invite();

      const reissued = await request(server())
        .post(`/api/users/${account.id}/invitation`)
        .set('Cookie', cookie)
        .expect(200);

      await request(server())
        .post('/api/auth/invitation')
        .send({ token: account.token, password: CHOSEN_PASSWORD })
        .expect(401);

      const fresh = reissued.body as { invitationToken: string };
      await request(server())
        .post('/api/auth/invitation')
        .send({ token: fresh.invitationToken, password: CHOSEN_PASSWORD })
        .expect(200);
    });

    it('refuses an admissions officer, with 403 rather than 404', async () => {
      const account = await invite();
      await request(server())
        .post('/api/auth/invitation')
        .send({ token: account.token, password: CHOSEN_PASSWORD })
        .expect(200);

      const res = await request(server())
        .post('/api/auth/login')
        .send({ email: account.email, password: CHOSEN_PASSWORD })
        .expect(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      const theirs = cookies.find((c) => c.startsWith('probo_session='))!;

      await request(server())
        .post(`/api/users/${admin.id}/invitation`)
        .set('Cookie', theirs)
        .expect(403);
    });
  });

  describe('the audit trail', () => {
    it('records the link and the password under their own actions', async () => {
      const account = await invite();
      await request(server())
        .post('/api/auth/invitation')
        .send({ token: account.token, password: CHOSEN_PASSWORD })
        .expect(200);

      const entries = await prisma.auditEntry.findMany({
        where: { entityId: account.id },
        orderBy: { occurredAt: 'asc' },
        select: { action: true, userId: true },
      });

      expect(entries.map((e) => e.action)).toEqual([
        'USER_CREATED',
        'USER_INVITED',
        'USER_PASSWORD_SET',
      ]);
      // The owner had no session when they set it: the entry names the account
      // it was done to, and no actor.
      expect(entries[2].userId).toBeNull();
      expect(entries[1].userId).toBe(admin.id);
    });
  });
});
