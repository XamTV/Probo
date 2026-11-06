import { describe, expect, it } from 'vitest';
import {
  AcceptInvitationInput,
  CreateUserInput,
  INVITATION_VALIDITY_DAYS,
  LOGIN_LOCKOUT_MINUTES,
  LOGIN_MAX_ATTEMPTS,
  LoginInput,
  PASSWORD_MIN_LENGTH,
  accountState,
  invitationExpiry,
  isInvitationUsable,
  isLockedOut,
  lockoutUntil,
} from './auth.js';

const NOW = new Date('2026-10-06T10:00:00Z');

describe('LoginInput', () => {
  it('normalises the email so casing and stray spaces never create a second account', () => {
    const parsed = LoginInput.parse({ email: '  Claire.Fontaine@ESM-Lyon.fr ', password: 'x' });
    expect(parsed.email).toBe('claire.fontaine@esm-lyon.fr');
  });

  it('rejects a malformed email', () => {
    expect(() => LoginInput.parse({ email: 'claire', password: 'x' })).toThrow();
  });

  it('accepts any non-empty password: length is checked when setting it, not when using it', () => {
    expect(() => LoginInput.parse({ email: 'a@b.fr', password: 'court' })).not.toThrow();
  });
});

describe('CreateUserInput', () => {
  it('accepts the two roles and nothing else', () => {
    expect(CreateUserInput.parse({ email: 'a@b.fr', name: 'Claire', role: 'ADMIN' }).role).toBe(
      'ADMIN',
    );
    expect(() =>
      CreateUserInput.parse({ email: 'a@b.fr', name: 'Claire', role: 'SUPERADMIN' }),
    ).toThrow();
  });

  it('rejects a blank name once trimmed', () => {
    expect(() => CreateUserInput.parse({ email: 'a@b.fr', name: '   ', role: 'ADMIN' })).toThrow();
  });
});

describe('US-01: account lockout', () => {
  it('is not locked out when no deadline is set', () => {
    expect(isLockedOut(null, NOW)).toBe(false);
  });

  it('is locked out while the deadline is in the future', () => {
    expect(isLockedOut(new Date(NOW.getTime() + 60_000), NOW)).toBe(true);
  });

  it('is no longer locked out once the deadline has passed', () => {
    expect(isLockedOut(new Date(NOW.getTime() - 1), NOW)).toBe(false);
  });

  it(`does not lock below ${LOGIN_MAX_ATTEMPTS} failures`, () => {
    expect(lockoutUntil(LOGIN_MAX_ATTEMPTS - 1, NOW)).toBeNull();
  });

  it(`locks for ${LOGIN_LOCKOUT_MINUTES} minutes on the ${LOGIN_MAX_ATTEMPTS}th failure`, () => {
    const until = lockoutUntil(LOGIN_MAX_ATTEMPTS, NOW);
    expect(until).not.toBeNull();
    expect(until!.getTime() - NOW.getTime()).toBe(LOGIN_LOCKOUT_MINUTES * 60_000);
  });

  it('keeps locking beyond the threshold rather than letting attempts through', () => {
    expect(lockoutUntil(LOGIN_MAX_ATTEMPTS + 10, NOW)).not.toBeNull();
  });
});

describe('US-02 — the invitation link', () => {
  const NOW = new Date('2026-11-06T10:00:00.000Z');

  it(`lasts ${INVITATION_VALIDITY_DAYS} days from the moment it is issued`, () => {
    const expiry = invitationExpiry(NOW);
    expect(expiry.getTime() - NOW.getTime()).toBe(INVITATION_VALIDITY_DAYS * 24 * 60 * 60_000);
  });

  it('is usable right up to its deadline, and not past it', () => {
    expect(isInvitationUsable(new Date(NOW.getTime() + 1), NOW)).toBe(true);
    expect(isInvitationUsable(new Date(NOW.getTime() - 1), NOW)).toBe(false);
  });

  it('treats no deadline as no invitation, which is the state after a password is set', () => {
    expect(isInvitationUsable(null, NOW)).toBe(false);
  });

  it('calls an account invited while nobody has set a password on it', () => {
    expect(accountState({ isActive: true, hasPassword: false })).toBe('INVITED');
    expect(accountState({ isActive: true, hasPassword: true })).toBe('ACTIVE');
  });

  it('calls a deactivated account deactivated, invited or not', () => {
    // US-02 — a deactivated account cannot sign in whatever else is true of
    // it, so that is the state worth showing first.
    expect(accountState({ isActive: false, hasPassword: false })).toBe('DEACTIVATED');
    expect(accountState({ isActive: false, hasPassword: true })).toBe('DEACTIVATED');
  });

  it('asks for a password at least as long as sign-in does', () => {
    expect(
      AcceptInvitationInput.safeParse({ token: 't'.repeat(43), password: 'short' }).success,
    ).toBe(false);
    expect(
      AcceptInvitationInput.safeParse({ token: 't'.repeat(43), password: 'a'.repeat(12) }).success,
    ).toBe(true);
  });

  it('refuses a token too short to have come from Probo', () => {
    expect(
      AcceptInvitationInput.safeParse({ token: 'abc', password: 'a'.repeat(12) }).success,
    ).toBe(false);
  });
});
