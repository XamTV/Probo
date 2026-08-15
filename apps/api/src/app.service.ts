import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'ok' | 'unreachable';
  version: string;
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async health(): Promise<HealthStatus> {
    let database: HealthStatus['database'] = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'unreachable';
    }

    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
