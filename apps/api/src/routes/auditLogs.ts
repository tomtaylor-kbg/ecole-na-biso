import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/errors.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

router.get(
  '/',
  requirePermission('audit:read'),
  asyncHandler(async (req, res) => {
    const module = typeof req.query.module === 'string' ? req.query.module : undefined;
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const take = Math.min(Number(req.query.take ?? 100) || 100, 250);

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(module && module !== 'all' ? { module } : {}),
        ...(action && action !== 'all' ? { action } : {}),
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, username: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take,
    });

    res.json(logs);
  })
);

export default router;
