import { ConflictException, Injectable } from '@nestjs/common';
import type { CreateUserInput, SessionUser, UpdateUserInput } from '@probo/shared';
import { randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { orNotFound, scopedWhere } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';

/** What a caller may see of an account. The password hash never leaves here. */
const VISIBLE = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

/** US-02 — the administrator manages their team's accounts. */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  list(caller: SessionUser) {
    return this.prisma.user.findMany({
      where: scopedWhere(caller, {}),
      select: VISIBLE,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(caller: SessionUser, id: string) {
    return orNotFound(
      await this.prisma.user.findFirst({
        where: scopedWhere(caller, { id }),
        select: VISIBLE,
      }),
    );
  }

  /**
   * Creates an account in the caller's own institution.
   *
   * The institution is never a parameter: it comes from the session, so an
   * administrator cannot create a user inside someone else's institution
   * (US-03).
   */
  async create(caller: SessionUser, input: CreateUserInput) {
    const taken = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (taken !== null) throw new ConflictException('EMAIL_ALREADY_USED');

    // No password is chosen here. A random one is stored so the account cannot
    // be signed into before its owner sets their own — the invitation flow
    // belongs to a later lot, and an account that is reachable in the meantime
    // would be worse than one that is not.
    const provisional = await this.auth.hashPassword(randomBytes(32).toString('hex'));

    const created = await this.prisma.user.create({
      data: {
        institutionId: caller.institutionId,
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash: provisional,
      },
      select: VISIBLE,
    });

    await this.audit.record({
      user: caller,
      institutionId: caller.institutionId,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: created.id,
      details: { email: input.email, role: input.role },
    });

    return created;
  }

  /**
   * Updates a name, a role or the active flag.
   *
   * There is no delete. US-02 requires that a deactivated account keeps the
   * batches it imported visible and attributed; removing the row would erase
   * that attribution and leave the audit trail pointing at nothing.
   */
  async update(caller: SessionUser, id: string, input: UpdateUserInput) {
    const existing = await this.findOne(caller, id);

    const updated = await this.prisma.user.update({
      where: { id: existing.id },
      data: input,
      select: VISIBLE,
    });

    await this.audit.record({
      user: caller,
      institutionId: caller.institutionId,
      action: input.isActive === false ? 'USER_DEACTIVATED' : 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      details: input,
    });

    return updated;
  }
}
