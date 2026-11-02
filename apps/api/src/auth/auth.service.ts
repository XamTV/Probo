import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type LoginInput, type SessionUser, isLockedOut, lockoutUntil } from '@probo/shared';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sign-in, with the two guarantees US-01 asks for: a failure message that
 * reveals nothing, and attempts delayed after six consecutive failures.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Argon2id, the memory-hard variant: a GPU buys an attacker far less. */
  hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  /**
   * US-01 — one message for every failure, whatever the cause.
   *
   * Unknown email, wrong password, deactivated account and locked account all
   * raise the same error. Distinguishing them would turn the sign-in form into
   * an oracle telling an attacker which addresses exist.
   */
  async signIn(input: LoginInput, now: Date = new Date()): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (user === null || !user.isActive) {
      // Hash anyway: returning early on an unknown address makes the response
      // measurably faster, which is the same oracle by another route.
      await argon2.hash(input.password, { type: argon2.argon2id });
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    if (isLockedOut(user.lockedUntil, now)) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) {
      const failed = user.failedLoginAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: failed, lockedUntil: lockoutUntil(failed, now) },
      });
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
    });

    return {
      id: user.id,
      institutionId: user.institutionId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * The account a failed sign-in was aimed at, for the audit trail alone.
   *
   * An audit entry belongs to a tenant, and a failure carries no session to
   * take one from. This is the only way to attach the entry to the right
   * institution — so an unknown address returns null and nothing is recorded:
   * there is no tenant it could belong to.
   *
   * It answers for a deactivated or locked account too, deliberately. Those
   * failures are the ones worth seeing in an audit trail.
   *
   * Nothing here reaches the caller: `signIn` keeps returning the same message
   * for every cause, and this result never leaves the server.
   */
  auditTargetFor(email: string): Promise<{ id: string; institutionId: string } | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, institutionId: true },
    });
  }

  /**
   * The session token.
   *
   * It carries `institutionId`, which is what lets every handler scope its
   * queries without a second lookup — and what makes the institution
   * unforgeable by the caller (US-03).
   */
  signSession(user: SessionUser): Promise<string> {
    return this.jwt.signAsync({
      sub: user.id,
      institutionId: user.institutionId,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }

  async verifySession(token: string): Promise<SessionUser> {
    const payload = await this.jwt.verifyAsync<{
      sub: string;
      institutionId: string;
      email: string;
      name: string;
      role: SessionUser['role'];
    }>(token);

    return {
      id: payload.sub,
      institutionId: payload.institutionId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  }
}
