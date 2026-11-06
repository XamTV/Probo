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

/**
 * US-02 — how long an invitation link stays usable.
 *
 * Seven days, counted from the moment the link is issued. An administrator can
 * always issue a new one; the previous link stops working at that instant.
 */
export const INVITATION_VALIDITY_DAYS = 7;

/** The deadline an invitation issued now would carry. */
export function invitationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITATION_VALIDITY_DAYS * 24 * 60 * 60_000);
}

/**
 * US-02 — whether an invitation can still be used.
 *
 * `null` means no invitation is pending, which is the state of every account
 * whose owner has already set a password.
 */
export function isInvitationUsable(expiresAt: Date | null, now: Date = new Date()): boolean {
  return expiresAt !== null && expiresAt.getTime() > now.getTime();
}

/**
 * US-02 — what an administrator reads in the state column.
 *
 * An invited account is one whose owner has never set a password. It is a
 * state of the account, not a separate entity — see the journal entry of
 * 2026-11-02 — so it is derived here rather than stored.
 */
export const AccountState = z.enum(['INVITED', 'ACTIVE', 'DEACTIVATED']);
export type AccountState = z.infer<typeof AccountState>;

export function accountState(account: { isActive: boolean; hasPassword: boolean }): AccountState {
  if (!account.isActive) return 'DEACTIVATED';
  return account.hasPassword ? 'ACTIVE' : 'INVITED';
}

/**
 * US-02 — the owner sets their own password from the link they were given.
 *
 * The token travels in the body rather than in the URL: a URL is written to
 * server logs and to the browser history, and this one is a credential until
 * it is used.
 */
export const AcceptInvitationInput = z.object({
  token: z.string().trim().min(32),
  password: z.string().min(PASSWORD_MIN_LENGTH),
});
export type AcceptInvitationInput = z.infer<typeof AcceptInvitationInput>;

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
