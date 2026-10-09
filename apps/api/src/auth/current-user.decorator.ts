import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SessionUser } from '@probo/shared';
import type { AuthenticatedRequest } from './auth.guard';

/**
 * The authenticated caller, as the guard established it.
 *
 * Handlers take it as a parameter rather than reading the request, so the
 * institution a query is scoped to is visible in the signature — and a handler
 * that forgot to scope is visible too.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user === undefined) {
      // Unreachable behind the global guard; thrown rather than cast away so a
      // future public route cannot silently receive an undefined user.
      throw new Error('CurrentUser used on a route the guard did not authenticate');
    }
    return request.user;
  },
);
