import { Router } from 'express';
import { z } from 'zod';
import { recordAudit } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

const schoolYearSchema = z.object({
  name: z.string().min(2),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().default(false),
});

router.get(
  '/',
  requirePermission('school-years:read'),
  asyncHandler(async (_req, res) => {
    const years = await prisma.schoolYear.findMany({
      orderBy: { startDate: 'desc' },
    });

    res.json(years);
  })
);

router.get(
  '/:id',
  requirePermission('school-years:read'),
  asyncHandler(async (req, res) => {
    const year = await prisma.schoolYear.findUnique({
      where: { id: req.params.id },
      include: { classes: true, fees: true, students: true },
    });
    if (!year) throw new ApiError(404, 'Année scolaire introuvable.');
    res.json(year);
  })
);

router.use(requirePermission('school-years:manage'));

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = schoolYearSchema.parse(req.body);

    const year = await prisma.$transaction(async (tx) => {
      if (data.isActive) {
        await tx.schoolYear.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      return tx.schoolYear.create({ data });
    });
    await recordAudit(req, {
      action: 'CREATE',
      module: 'Années scolaires',
      entityType: 'SchoolYear',
      entityId: year.id,
      description: `Année scolaire "${year.name}" créée.`,
      metadata: { isActive: year.isActive },
    });
    res.status(201).json(year);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = schoolYearSchema.partial().parse(req.body);

    const year = await prisma.$transaction(async (tx) => {
      if (data.isActive) {
        await tx.schoolYear.updateMany({
          where: { isActive: true, id: { not: id } },
          data: { isActive: false },
        });
      }

      return tx.schoolYear.update({
        where: { id },
        data,
      });
    });

    await recordAudit(req, {
      action: 'UPDATE',
      module: 'Années scolaires',
      entityType: 'SchoolYear',
      entityId: year.id,
      description: `Année scolaire "${year.name}" modifiée.`,
      metadata: { isActive: year.isActive },
    });
    res.json(year);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const year = await prisma.schoolYear.delete({ where: { id: req.params.id } });
    await recordAudit(req, {
      action: 'DELETE',
      module: 'Années scolaires',
      entityType: 'SchoolYear',
      entityId: year.id,
      description: `Année scolaire "${year.name}" supprimée.`,
      metadata: { isActive: year.isActive },
    });
    res.status(204).send();
  })
);

export default router;
