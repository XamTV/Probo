import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionUser, UserRole } from '@probo/shared';
import type { Request } from 'express';
import { AuthService } from './auth.service';

/** Name of the httpOnly cookie carrying the session. */
export const SESSION_COOKIE = 'probo_session';

const PUBLIC = 'probo:public';
const ROLES = 'probo:roles';

/** Opens a route to unauthenticated callers. Sign-in and the health probe. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(PUBLIC, true);

/** Restricts a route to the listed roles. */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES, roles);

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}

/**
 * Authentication, applied globally.
 *
 * Registered as a global guard so a route is protected unless it says
 * otherwise: forgetting `@Public()` locks a route down, while forgetting a
 * guard would have opened it. The failure mode points the safe way.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (token === undefined) throw new UnauthorizedException();

    try {
      request.user = await this.auth.verifySession(token);
    } catch {
      throw new UnauthorizedException();
    }

    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    // A role that is merely missing is a 403: the caller is known, and the
    // resource's existence is not in question. That is the one case US-03's
    // "404, never 403" does not cover — it is about another institution's
    // data, not about one's own institution's permissions.
    if (roles !== undefined && !roles.includes(request.user.role)) {
      throw new ForbiddenException();
    }

    return true;
  }
}
