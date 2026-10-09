import { z } from 'zod';
import { UserRole } from './enums.js';

/**
 * Authentication and account contracts, shared by the API and the front end.
 *
 * French counterpart: US-01 (sign in), US-02 (create the team's accounts) and
 * US-03 (never see another institution's data) in docs/analyse/user-stories.md.
 */

/** Minimum password length. Long over complex: length is what resists. */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * US-01 — after six consecutive failures on one account, attempts are delayed.
 *
 * Counted per ACCOUNT, not per IP address. An attacker spreads attempts over
 * many addresses, so an IP counter protects nothing; and locking by IP would
 * lock out a whole institution behind one NAT gateway.
 */
export const LOGIN_MAX_ATTEMPTS = 6;

/** How long an account stays locked once the threshold is crossed. */
export const LOGIN_LOCKOUT_MINUTES = 15;

export const LoginInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const CreateUserInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120),
  role: UserRole,
});
export type CreateUserInput = z.infer<typeof CreateUserInput>;

export const UpdateUserInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    role: UserRole,
    isActive: z.boolean(),
  })
  .partial();
export type UpdateUserInput = z.infer<typeof UpdateUserInput>;

export const SetPasswordInput = z.object({
  password: z.string().min(PASSWORD_MIN_LENGTH),
});
export type SetPasswordInput = z.infer<typeof SetPasswordInput>;

/**
 * The authenticated caller, as every request handler sees it.
 *
 * `institutionId` travels with the session rather than with the request, which
 * is what makes tenant isolation structural: a handler cannot filter by an
 * institution the caller did not prove they belong to (US-03).
 */
export interface SessionUser {
  id: string;
  institutionId: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * US-01 — whether an account is currently locked out.
 *
 * Exposed as a function rather than a comparison inlined in the service so the
 * rule is named, tested, and identical wherever it is asked.
 */
export function isLockedOut(lockedUntil: Date | null, now: Date = new Date()): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/**
 * US-01 — the new lockout deadline after a failed attempt, or `null` while the
 * account is still below the threshold.
 *
 * `failedAttempts` is the count INCLUDING the attempt that just failed.
 */
export function lockoutUntil(failedAttempts: number, now: Date = new Date()): Date | null {
  if (failedAttempts < LOGIN_MAX_ATTEMPTS) return null;
  return new Date(now.getTime() + LOGIN_LOCKOUT_MINUTES * 60_000);
}
