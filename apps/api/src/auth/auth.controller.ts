import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { LoginInput, type SessionUser } from '@probo/shared';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuditService } from '../audit/audit.service';
import { Public, SESSION_COOKIE } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  /**
   * US-01 — sign in.
   *
   * The token goes into an httpOnly cookie rather than the response body: the
   * page's JavaScript never holds it, so a cross-site scripting flaw cannot
   * read the session.
   */
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginInput)) input: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionUser> {
    try {
      const user = await this.auth.signIn(input);
      const token = await this.auth.signSession(user);

      response.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 12 * 60 * 60 * 1000,
      });

      await this.audit.record({
        user,
        institutionId: user.institutionId,
        action: 'USER_LOGGED_IN',
        entityType: 'SESSION',
        entityId: user.id,
        request,
      });

      return user;
    } catch (error) {
      // A failed attempt is recorded too, but without an institution we have
      // no tenant to attach it to — so it is only logged when the address
      // matches a known account. The lockout counter carries the rest.
      const known = await this.auth.auditTargetFor(input.email);
      if (known !== null) {
        await this.audit.record({
          user: null,
          institutionId: known.institutionId,
          action: 'USER_LOGIN_FAILED',
          entityType: 'SESSION',
          entityId: known.id,
          request,
        });
      }
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  /** Who the caller is. The front end uses it to restore a session on reload. */
  @Get('me')
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }
}
