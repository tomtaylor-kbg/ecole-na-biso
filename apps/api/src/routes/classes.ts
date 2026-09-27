import { Router } from 'express';
import { z } from 'zod';
import { recordAudit } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const feeCurrency = (fee: unknown) => (fee as { currency?: string | null }).currency ?? 'USD';

const classSchema = z.object({
  name: z.string().min(2),
  level: z.string().min(2),
  schoolYearId: z.string().min(1),
});

async function getClassFeeConfiguration(id: string) {
  const schoolClass = await prisma.class.findUnique({
    where: { id },
    include: {
      schoolYear: true,
      students: {
        select: { id: true, matricule: true, firstName: true, lastName: true, status: true },
        orderBy: { lastName: 'asc' },
      },
    },
  });

  if (!schoolClass) throw new ApiError(404, 'Classe introuvable.');

  const fees = await prisma.fee.findMany({
    where: {
      schoolYearId: schoolClass.schoolYearId,
      status: 'active',
      studentId: null,
      OR: [
        { classId: schoolClass.id },
        { classId: null },
      ],
    },
    orderBy: [{ classId: 'asc' }, { createdAt: 'asc' }],
  });

  const feeIds = fees.map((fee) => fee.id);
  const studentIds = schoolClass.students.map((student) => student.id);
  const paidByFee = feeIds.length && studentIds.length
    ? await prisma.payment.groupBy({
        by: ['feeId'],
        where: { feeId: { in: feeIds }, studentId: { in: studentIds }, status: 'confirmed' },
        _sum: { amount: true },
      })
    : [];
  const paidMap = new Map(paidByFee.map((row) => [row.feeId, Number(row._sum.amount ?? 0)]));

  const feeRows = fees.map((fee) => {
    const amount = Number(fee.amount);
    const expectedTotal = amount * schoolClass.students.length;
    const paidTotal = paidMap.get(fee.id) ?? 0;
    return {
      id: fee.id,
      name: fee.name,
      scope: fee.classId ? 'Classe' : 'Global',
      amount,
      currency: feeCurrency(fee),
      dueDate: fee.dueDate,
      expectedTotal,
      paidTotal,
      balanceTotal: Math.max(expectedTotal - paidTotal, 0),
    };
  });

  const perStudentTotal = feeRows.reduce((sum, fee) => sum + fee.amount, 0);
  const expectedTotal = feeRows.reduce((sum, fee) => sum + fee.expectedTotal, 0);
  const paidTotal = feeRows.reduce((sum, fee) => sum + fee.paidTotal, 0);

  return {
    class: {
      id: schoolClass.id,
      name: schoolClass.name,
      level: schoolClass.level,
      schoolYear: schoolClass.schoolYear.name,
    },
    currency: feeRows[0]?.currency ?? 'USD',
    studentCount: schoolClass.students.length,
    summary: {
      perStudentTotal,
      expectedTotal,
      paidTotal,
      balanceTotal: Math.max(expectedTotal - paidTotal, 0),
    },
    fees: feeRows,
  };
}

router.get(
  '/',
  requirePermission('classes:read'),
  asyncHandler(async (_req, res) => {
    const classes = await prisma.class.findMany({
      include: { schoolYear: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(classes);
  })
);

router.get(
  '/:id/fee-configuration',
  requirePermission('fees:read'),
  asyncHandler(async (req, res) => {
    const configuration = await getClassFeeConfiguration(req.params.id);
    res.json(configuration);
  })
);

router.get(
  '/:id',
  requirePermission('classes:read'),
  asyncHandler(async (req, res) => {
    const schoolClass = await prisma.class.findUnique({
      where: { id: req.params.id },
      include: { schoolYear: true, students: true, fees: true },
    });
    if (!schoolClass) throw new ApiError(404, 'Classe introuvable.');
    res.json(schoolClass);
  })
);

router.use(requirePermission('classes:manage'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = classSchema.parse(req.body);
    const created = await prisma.class.create({ data, include: { schoolYear: true } });
    await recordAudit(req, {
      action: 'CREATE',
      module: 'Classes',
      entityType: 'Class',
      entityId: created.id,
      description: `Classe "${created.name}" créée.`,
      metadata: { level: created.level, schoolYear: created.schoolYear.name },
    });
    res.status(201).json(created);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = classSchema.partial().parse(req.body);
    const updated = await prisma.class.update({
      where: { id },
      data,
      include: { schoolYear: true },
    });
    await recordAudit(req, {
      action: 'UPDATE',
      module: 'Classes',
      entityType: 'Class',
      entityId: updated.id,
      description: `Classe "${updated.name}" modifiée.`,
      metadata: { level: updated.level, schoolYear: updated.schoolYear.name },
    });
    res.json(updated);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await prisma.class.delete({ where: { id } });
    await recordAudit(req, {
      action: 'DELETE',
      module: 'Classes',
      entityType: 'Class',
      entityId: deleted.id,
      description: `Classe "${deleted.name}" supprimée.`,
      metadata: { level: deleted.level },
    });
    res.status(204).send();
  })
);

export default router;
