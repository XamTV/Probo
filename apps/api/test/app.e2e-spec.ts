import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Test de bout en bout : nécessite Postgres et Redis démarrés
 * (`npm run infra:up`). Exécuté par `npm run test:e2e`, pas par `npm test`.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('GET /api/sante répond ok quand l’infrastructure est là', () => {
    return request(app.getHttpServer())
      .get('/api/sante')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ statut: 'ok', baseDeDonnees: 'ok' });
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
