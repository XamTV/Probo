import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { readIngestionLimits } from '../ingestion/ingestion-limits';
import { StorageModule } from '../storage/storage.module';
import { StorageService } from '../storage/storage.service';
import { ImportEventsListener } from './import-events.listener';
import { IMPORT_QUEUE } from './import-queue';
import { ImportProcessor } from './import.processor';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [
    StorageModule,
    BullModule.registerQueue({ name: IMPORT_QUEUE }),
    // A factory, so the ceiling comes from the environment once ConfigModule
    // has loaded it. Exceeding it answers 413 and multer deletes the partial
    // file itself.
    MulterModule.registerAsync({
      imports: [StorageModule],
      inject: [ConfigService, StorageService],
      useFactory: (config: ConfigService, storage: StorageService) => {
        const incoming = storage.incomingDirectory();
        mkdirSync(incoming, { recursive: true });
        return {
          storage: diskStorage({
            destination: incoming,
            // The uploaded name never reaches a path, here either.
            filename: (_request, _file, done) => done(null, `${randomUUID()}.zip`),
          }),
          limits: { fileSize: readIngestionLimits(config).maxArchiveBytes, files: 1 },
          // Archive names written by French users are accented; multer reads
          // them as Latin-1 unless told otherwise.
          defParamCharset: 'utf8',
        };
      },
    }),
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportProcessor, ImportEventsListener],
})
export class ImportsModule {}
