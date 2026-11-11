import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Sse,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ARCHIVE_FIELD, type SessionUser } from '@probo/shared';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { ImportsService } from './imports.service';

/**
 * US-07 — the archive deposit, the only way into the product.
 *
 * Open to both roles: importing is Claire's work, not an administrator's.
 */
@Controller()
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  /**
   * 202: the archive is accepted for unpacking, not unpacked. What became of
   * it is read from the batch, or followed on its progress stream.
   *
   * The file streams to disk as it arrives — never into memory, at up to
   * 3 GB — and the size ceiling is enforced by the upload itself, before any
   * batch exists.
   */
  @Post('campaigns/:campaignId/imports')
  @HttpCode(202)
  @UseInterceptors(FileInterceptor(ARCHIVE_FIELD))
  deposit(
    @CurrentUser() caller: SessionUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @UploadedFile() archive: Express.Multer.File | undefined,
    @Req() request: Request,
  ) {
    return this.imports.deposit(caller, campaignId, archive, request);
  }

  @Get('imports/:id')
  findOne(@CurrentUser() caller: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.imports.findOne(caller, id);
  }

  /**
   * Q-05 — Server-Sent Events. The session cookie travels with EventSource on
   * the same origin, so the global guard applies unchanged.
   */
  @Sse('imports/:id/events')
  events(@CurrentUser() caller: SessionUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.imports.progress(caller, id);
  }
}
