import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateUserInput, type SessionUser, UpdateUserInput } from '@probo/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService } from './users.service';

/**
 * US-02 — the administrator creates and manages their team's accounts.
 *
 * `@Roles('ADMIN')` sits on the class: an admissions officer can neither
 * create an account nor change one, which is the criterion stated in US-02.
 */
@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentUser() caller: SessionUser) {
    return this.users.list(caller);
  }

  @Get(':id')
  findOne(@CurrentUser() caller: SessionUser, @Param('id') id: string) {
    return this.users.findOne(caller, id);
  }

  // The pipe goes on the PARAMETER, never on the handler: @UsePipes applies to
  // every parameter, so it would also run the body schema against the session
  // object — Zod would strip institutionId, and the isolation would silently
  // vanish. The end-to-end test caught exactly that.
  @Post()
  create(
    @CurrentUser() caller: SessionUser,
    @Body(new ZodValidationPipe(CreateUserInput)) input: CreateUserInput,
  ) {
    return this.users.create(caller, input);
  }

  @Patch(':id')
  update(
    @CurrentUser() caller: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserInput)) input: UpdateUserInput,
  ) {
    return this.users.update(caller, id, input);
  }
}
