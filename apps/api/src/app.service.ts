import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

export interface EtatSante {
  statut: 'ok' | 'degrade';
  baseDeDonnees: 'ok' | 'injoignable';
  version: string;
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async sante(): Promise<EtatSante> {
    let baseDeDonnees: EtatSante['baseDeDonnees'] = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      baseDeDonnees = 'injoignable';
    }

    return {
      statut: baseDeDonnees === 'ok' ? 'ok' : 'degrade',
      baseDeDonnees,
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
