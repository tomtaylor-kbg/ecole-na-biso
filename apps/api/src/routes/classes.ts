import { Router } from 'express';
import { z } from 'zod';
import { classInputSchema, classOrientationSchema, classSectionSchema, classStatusSchema } from '@school-fees/contracts';
import type { ClassInput } from '@school-fees/contracts';
import { recordAudit } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();
const feeCurrency = (fee: unknown) => (fee as { currency?: string | null }).currency ?? 'USD';

// Enums synchronisés avec Prisma
const classSectionEnum = classSectionSchema;
const classOrientationEnum = classOrientationSchema;
const classStatusEnum = classStatusSchema;
const classSchema = classInputSchema;

const classUpdateSchema = z.object({
  code: z.string().trim().min(2).max(20).optional(),
  name: z.string().trim().min(2).max(100).optional(),
  levelId: z.string().min(1).optional(),
  level: z.string().trim().min(1).optional(),
  schoolYearId: z.string().min(1).optional(),
  section: classSectionEnum.optional(),
  orientation: classOrientationEnum.optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  status: classStatusEnum.optional(),
  teacherId: z.string().min(1).optional().nullable(),
}).strict();

function normalizeClassPayload(input: ClassInput & { levelId: string }) {
  return {
    name: input.name.trim(),
    code: input.code.trim(),
    levelId: input.levelId,
    schoolYearId: input.schoolYearId,
    section: input.section ?? 'UNIQUE',
    orientation: input.orientation,
    capacity: input.capacity,
    status: input.status ?? 'ACTIVE',
    teacherId: input.teacherId,
  };
}

async function resolveLevelId(levelId?: string, levelName?: string) {
  const reference = levelId ?? levelName;
  if (!reference) throw new ApiError(400, 'Le niveau de la classe est requis.');
  const level = await prisma.level.findFirst({
    where: { OR: [{ id: reference }, { name: { equals: reference, mode: 'insensitive' } }] },
    select: { id: true },
  });
  if (level) return level.id;
  if (levelId) throw new ApiError(400, `Niveau introuvable : ${reference}.`);

  const levels = {
    Maternelle: { code: 'MATERNELLE', cycle: 'MATERNELLE' as const, order: 1 },
    Primaire: { code: 'PRIMAIRE', cycle: 'PRIMAIRE' as const, order: 2 },
    Secondaire: { code: 'SECONDAIRE', cycle: 'SECONDAIRE' as const, order: 3 },
  } as const;
  const definition = levels[reference as keyof typeof levels];
  if (!definition) throw new ApiError(400, `Niveau introuvable : ${reference}.`);
  const created = await prisma.level.upsert({
    where: { code: definition.code },
    update: {},
    create: { code: definition.code, name: reference, cycle: definition.cycle, order: definition.order },
    select: { id: true },
  });
  return created.id;
}

async function getClassFeeConfiguration(id: string) {
  const schoolClass = await prisma.class.findUnique({
    where: { id },
    include: {
      schoolYear: true,
      level: true,
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
        { levelId: schoolClass.levelId },
      ],
    },
    orderBy: [{ classId: 'asc' }, { levelId: 'asc' }, { createdAt: 'asc' }],
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
      code: schoolClass.code,
      level: schoolClass.level.name,
      levelId: schoolClass.levelId,
      section: schoolClass.section,
      orientation: schoolClass.orientation,
      capacity: schoolClass.capacity,
      status: schoolClass.status,
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
      include: { schoolYear: true, level: true, teacher: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const serialized = classes.map((schoolClass) => ({
      ...schoolClass,
      level: schoolClass.level.name,
      levelId: schoolClass.levelId,
      teacher: schoolClass.teacher ? {
        id: schoolClass.teacher.id,
        firstName: schoolClass.teacher.firstName,
        lastName: schoolClass.teacher.lastName,
      } : null,
    }));
    res.json(serialized);
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
      include: { schoolYear: true, level: true, students: true, fees: true, teacher: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!schoolClass) throw new ApiError(404, 'Classe introuvable.');
    res.json({
      ...schoolClass,
      level: schoolClass.level.name,
      levelId: schoolClass.levelId,
      teacher: schoolClass.teacher ? {
        id: schoolClass.teacher.id,
        firstName: schoolClass.teacher.firstName,
        lastName: schoolClass.teacher.lastName,
      } : null,
    });
  })
);

router.use(requirePermission('classes:manage'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = classSchema.parse(req.body);
    const levelId = await resolveLevelId(payload.levelId, payload.level);
    const data = normalizeClassPayload({
      ...payload,
      code: payload.code,
      levelId,
      schoolYearId: payload.schoolYearId,
    });
    const created = await prisma.class.create({
      data,
      include: { schoolYear: true, level: true, teacher: { select: { id: true, firstName: true, lastName: true } } },
    });
    await recordAudit(req, {
      action: 'CREATE',
      module: 'Classes',
      entityType: 'Class',
      entityId: created.id,
      description: `Classe "${created.name}" créée.`,
      metadata: { 
        code: created.code, 
        level: created.level.name, 
        section: created.section,
        orientation: created.orientation,
        status: created.status,
        schoolYear: created.schoolYear.name,
        teacherId: created.teacherId,
        capacity: created.capacity 
      },
    });
    res.status(201).json({
      ...created,
      level: created.level.name,
      teacher: created.teacher ? {
        id: created.teacher.id,
        firstName: created.teacher.firstName,
        lastName: created.teacher.lastName,
      } : null,
    });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const incoming = classUpdateSchema.parse(req.body);
    const current = await prisma.class.findUnique({
      where: { id },
      include: { level: true, teacher: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!current) throw new ApiError(404, 'Classe introuvable.');

    const resolvedLevelId = incoming.levelId !== undefined || incoming.level !== undefined
      ? await resolveLevelId(incoming.levelId, incoming.level)
      : undefined;
    const data = {
      ...(incoming.code !== undefined ? { code: incoming.code } : {}),
      ...(incoming.name !== undefined ? { name: incoming.name } : {}),
      ...(resolvedLevelId !== undefined ? { levelId: resolvedLevelId } : {}),
      ...(incoming.schoolYearId !== undefined ? { schoolYearId: incoming.schoolYearId } : {}),
      ...(incoming.section !== undefined ? { section: incoming.section } : {}),
      ...(incoming.orientation !== undefined ? { orientation: incoming.orientation } : {}),
      ...(incoming.capacity !== undefined ? { capacity: incoming.capacity } : {}),
      ...(incoming.status !== undefined ? { status: incoming.status } : {}),
      ...(incoming.teacherId !== undefined ? { teacherId: incoming.teacherId } : {}),
    };

    const updated = await prisma.class.update({
      where: { id },
      data,
      include: { schoolYear: true, level: true, teacher: { select: { id: true, firstName: true, lastName: true } } },
    });
    await recordAudit(req, {
      action: 'UPDATE',
      module: 'Classes',
      entityType: 'Class',
      entityId: updated.id,
      description: `Classe "${updated.name}" modifiée.`,
      metadata: { 
        code: updated.code, 
        level: updated.level.name, 
        section: updated.section,
        orientation: updated.orientation,
        status: updated.status,
        schoolYear: updated.schoolYear.name,
        teacherId: updated.teacherId,
        capacity: updated.capacity 
      },
    });
    res.json({
      ...updated,
      level: updated.level.name,
      teacher: updated.teacher ? {
        id: updated.teacher.id,
        firstName: updated.teacher.firstName,
        lastName: updated.teacher.lastName,
      } : null,
    });
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
      metadata: { 
        code: deleted.code, 
        levelId: deleted.levelId, 
        section: deleted.section,
        orientation: deleted.orientation,
        status: deleted.status,
        teacherId: deleted.teacherId,
        capacity: deleted.capacity 
      },
    });
    res.status(204).send();
  })
);

export default router;
