import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('GET /api/sante', () => {
    it('renvoie ok quand la base répond', async () => {
      await expect(appController.sante()).resolves.toMatchObject({
        statut: 'ok',
        baseDeDonnees: 'ok',
      });
    });

    it('renvoie degrade quand la base est injoignable', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connexion refusée'));

      await expect(appController.sante()).resolves.toMatchObject({
        statut: 'degrade',
        baseDeDonnees: 'injoignable',
      });
    });
  });
});
