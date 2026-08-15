import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Client Prisma exposé comme provider NestJS.
 *
 * Depuis Prisma 7, l'URL de connexion ne vient plus du schéma : le client
 * reçoit un adaptateur de driver. On construit donc l'adaptateur à partir de
 * la configuration NestJS, ce qui garde une seule source de vérité pour les
 * variables d'environnement.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('DATABASE_URL');
    super({ adapter: new PrismaPg({ connectionString: url }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
