import { ConflictException, Injectable } from '@nestjs/common';
import {
  type CreateUserInput,
  type SessionUser,
  type UpdateUserInput,
  accountState,
} from '@probo/shared';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { orNotFound, scopedWhere } from '../common/tenant';
import { PrismaService } from '../prisma/prisma.service';

/**
 * What is read from the row. `passwordHash` is read but never returned: only
 * whether it is null leaves this file, as the account's state.
 */
const STORED = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  passwordHash: true,
  invitationExpiresAt: true,
} as const;

type Stored = {
  id: string;
  email: string;
  name: string;
  role: SessionUser['role'];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  passwordHash: string | null;
  invitationExpiresAt: Date | null;
};

/** What a caller may see of an account. The hash is dropped here, once. */
function expose(row: Stored) {
  const { passwordHash, ...rest } = row;
  return {
    ...rest,
    state: accountState({ isActive: row.isActive, hasPassword: passwordHash !== null }),
  };
}

/** US-02 — the administrator manages their team's accounts. */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  async list(caller: SessionUser) {
    const rows = await this.prisma.user.findMany({
      where: scopedWhere(caller, {}),
      select: STORED,
      orderBy: { name: 'asc' },
    });
    return rows.map(expose);
  }

  async findOne(caller: SessionUser, id: string) {
    return expose(
      orNotFound(
        await this.prisma.user.findFirst({
          where: scopedWhere(caller, { id }),
          select: STORED,
        }),
      ),
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

    // US-02 — no password is chosen here, and none is invented either. The
    // account is created without one, which is why `passwordHash` is nullable:
    // "invited, not yet activated" is a real state and the schema says so.
    const created = await this.prisma.user.create({
      data: {
        institutionId: caller.institutionId,
        email: input.email,
        name: input.name,
        role: input.role,
      },
      select: STORED,
    });

    await this.audit.record({
      user: caller,
      institutionId: caller.institutionId,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: created.id,
      details: { email: input.email, role: input.role },
    });

    const invitation = await this.invite(caller, created.id);

    return { ...expose(created), ...invitation };
  }

  /**
   * US-02 — issues an invitation link, for a new account or a lost one.
   *
   * The clear token is returned here and nowhere else: Probo sends no email,
   * so the administrator copies the link and passes it on themselves. Issuing
   * a new link kills the previous one.
   */
  async invite(caller: SessionUser, id: string) {
    const account = await this.findOne(caller, id);
    const { token, expiresAt } = await this.auth.issueInvitation(account.id);

    await this.audit.record({
      user: caller,
      institutionId: caller.institutionId,
      action: 'USER_INVITED',
      entityType: 'USER',
      entityId: account.id,
      details: { expiresAt: expiresAt.toISOString() },
    });

    return { invitationToken: token, invitationExpiresAt: expiresAt };
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
      select: STORED,
    });

    await this.audit.record({
      user: caller,
      institutionId: caller.institutionId,
      action: input.isActive === false ? 'USER_DEACTIVATED' : 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      details: input,
    });

    return expose(updated);
  }
}
