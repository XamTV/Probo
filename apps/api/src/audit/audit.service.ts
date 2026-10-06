import { Injectable } from '@nestjs/common';
import type { AuditAction, AuditEntityType, SessionUser } from '@probo/shared';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The audit trail (M-12, US-21).
 *
 * Attached to the institution and not to the resource, so purging applications
 * leaves the trail intact — that is what lets an institution prove an erasure
 * request was honoured after the data is gone.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    user: SessionUser | null;
    institutionId: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId?: string | null;
    details?: Record<string, unknown> | null;
    request?: Request;
  }): Promise<void> {
    await this.prisma.auditEntry.create({
      data: {
        institutionId: params.institutionId,
        userId: params.user?.id ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        ipAddress: params.request?.ip ?? null,
        userAgent: params.request?.get('user-agent') ?? null,
        details: (params.details ?? undefined) as never,
      },
    });
  }
}
