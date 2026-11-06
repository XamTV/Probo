import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import {
  CreateCampaignInput,
  ReferenceTextInput,
  type SessionUser,
  UpdateCampaignInput,
} from '@probo/shared';
import { Roles } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CampaignsService } from './campaigns.service';

/**
 * US-04, US-05, US-06, US-22 — campaigns and their comparison references.
 *
 * Reading is open to both roles and writing is not: Claire imports into a
 * campaign, so she has to see it, while configuring one is Marc's job. That is
 * why `@Roles('ADMIN')` sits on the handlers here rather than on the class, as
 * it does on UsersController where nothing is readable by an officer.
 */
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(@CurrentUser() caller: SessionUser) {
    return this.campaigns.list(caller);
  }

  @Get(':id')
  findOne(@CurrentUser() caller: SessionUser, @Param('id') id: string) {
    return this.campaigns.findOne(caller, id);
  }

  // The pipe goes on the PARAMETER, never on the handler — see the note in
  // UsersController: on the handler it would strip institutionId from the
  // session object and the isolation would vanish without a sound.
  @Post()
  @Roles('ADMIN')
  create(
    @CurrentUser() caller: SessionUser,
    @Body(new ZodValidationPipe(CreateCampaignInput)) input: CreateCampaignInput,
  ) {
    return this.campaigns.create(caller, input);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @CurrentUser() caller: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCampaignInput)) input: UpdateCampaignInput,
  ) {
    return this.campaigns.update(caller, id, input);
  }

  /**
   * PUT and not POST: a document type carries one reference or none, so saving
   * twice for the same type leaves the same single row. The verb says it.
   *
   * Described profiles only. The uploaded form waits for the extraction chain
   * of lot 4, because US-22 refuses an unreadable reference at save time and
   * nothing can read one yet.
   */
  @Put(':id/references')
  @Roles('ADMIN')
  saveReference(
    @CurrentUser() caller: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReferenceTextInput)) input: ReferenceTextInput,
  ) {
    return this.campaigns.saveReference(caller, id, input);
  }

  @Post(':id/activation')
  @Roles('ADMIN')
  activate(@CurrentUser() caller: SessionUser, @Param('id') id: string) {
    return this.campaigns.activate(caller, id);
  }
}
