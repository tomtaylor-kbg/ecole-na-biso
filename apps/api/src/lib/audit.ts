import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from './prisma.js';

type AuditInput = {
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
};

export async function recordAudit(req: Request, input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      metadata: input.metadata,
      userId: req.user?.id ?? null,
    },
  });
}
