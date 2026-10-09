import { describe, expect, it } from 'vitest';
import {
  CreateUserInput,
  LOGIN_LOCKOUT_MINUTES,
  LOGIN_MAX_ATTEMPTS,
  LoginInput,
  PASSWORD_MIN_LENGTH,
  SetPasswordInput,
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

describe('SetPasswordInput', () => {
  it(`requires at least ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(() =>
      SetPasswordInput.parse({ password: 'a'.repeat(PASSWORD_MIN_LENGTH) }),
    ).not.toThrow();
    expect(() =>
      SetPasswordInput.parse({ password: 'a'.repeat(PASSWORD_MIN_LENGTH - 1) }),
    ).toThrow();
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
