import { NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@probo/shared';

/**
 * US-03 — never see another institution's data.
 *
 * Two helpers, deliberately tiny, so the rule is named at every call site
 * rather than reimplemented as an `if` the next handler forgets.
 */

/**
 * Adds the caller's institution to a `where` clause.
 *
 * The institution comes from the SESSION, never from the request: a caller
 * cannot ask for an institution they have not proved they belong to. That is
 * what makes the isolation structural rather than a check someone can skip.
 */
export function scopedWhere<T extends object>(
  user: SessionUser,
  where: T,
): T & { institutionId: string } {
  return { ...where, institutionId: user.institutionId };
}

/**
 * Turns a missing row into a 404.
 *
 * US-03 requires **404 and never 403** for a resource belonging to another
 * institution. The difference matters: 403 confirms the resource exists, which
 * tells an attacker that the identifier they guessed is real. 404 says nothing.
 *
 * Because the query is already scoped by institution, another tenant's row
 * simply does not come back — so the 404 is a consequence of the query, not a
 * second check that could disagree with it.
 */
export function orNotFound<T>(row: T | null): T {
  if (row === null) throw new NotFoundException();
  return row;
}
