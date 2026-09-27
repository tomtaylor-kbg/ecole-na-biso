import { Router } from 'express';
import { z } from 'zod';
import { recordAudit } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

const feeSchema = z.object({
  name: z.string().min(2),
  amount: z.coerce.number().positive(),
  currency: z.string().min(2).max(8).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.string().default('active'),
  schoolYearId: z.string().min(1),
  classId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
});
const feeCurrency = (fee: unknown) => (fee as { currency?: string | null }).currency ?? 'USD';

router.get(
  '/',
  requirePermission('fees:read'),
  asyncHandler(async (_req, res) => {
    const fees = await prisma.fee.findMany({
      include: { schoolYear: true, class: true, student: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(fees);
  })
);

router.get(
  '/:id',
  requirePermission('fees:read'),
  asyncHandler(async (req, res) => {
    const fee = await prisma.fee.findUnique({
      where: { id: req.params.id },
      include: { schoolYear: true, class: true, student: true, payments: true },
    });
    if (!fee) throw new ApiError(404, 'Frais introuvable.');
    res.json(fee);
  })
);

router.use(requirePermission('fees:manage'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = feeSchema.parse(req.body);
    const fee = await prisma.fee.create({
      data: {
        ...data,
        amount: data.amount,
        currency: data.currency?.toUpperCase() ?? 'USD',
      } as any,
      include: { schoolYear: true, class: true, student: true },
    });
    await recordAudit(req, {
      action: 'CREATE',
      module: 'Frais',
      entityType: 'Fee',
      entityId: fee.id,
      description: `Frais "${fee.name}" créé pour ${Number(fee.amount).toFixed(2)} ${feeCurrency(fee)}.`,
      metadata: { amount: Number(fee.amount), currency: feeCurrency(fee), status: fee.status },
    });
    res.status(201).json(fee);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = feeSchema.partial().parse(req.body);
    const fee = await prisma.fee.update({
      where: { id },
      data: {
        ...data,
        amount: data.amount ?? undefined,
        currency: data.currency?.toUpperCase() ?? undefined,
      } as any,
      include: { schoolYear: true, class: true, student: true },
    });
    await recordAudit(req, {
      action: 'UPDATE',
      module: 'Frais',
      entityType: 'Fee',
      entityId: fee.id,
      description: `Frais "${fee.name}" modifié.`,
      metadata: { amount: Number(fee.amount), currency: feeCurrency(fee), status: fee.status },
    });
    res.json(fee);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const fee = await prisma.fee.delete({ where: { id: req.params.id } });
    await recordAudit(req, {
      action: 'DELETE',
      module: 'Frais',
      entityType: 'Fee',
      entityId: fee.id,
      description: `Frais "${fee.name}" supprimé.`,
      metadata: { amount: Number(fee.amount), currency: feeCurrency(fee), status: fee.status },
    });
    res.status(204).send();
  })
);

export default router;
