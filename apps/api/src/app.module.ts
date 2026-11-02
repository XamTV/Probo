import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // The monorepo has a single .env, at the root.
      envFilePath: resolve(__dirname, '../../../.env'),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CampaignsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Authentication is global: a route is protected unless it declares
    // @Public(). Forgetting the decorator locks a route down; forgetting a
    // guard would have opened it. The failure mode points the safe way.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
