import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { recordAudit } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { requireAdmin, requireAuth, requirePermission } from '../middleware/auth.js';

const router = Router();

const settingsSchema = z.object({
  name: z.string().min(2),
  legalName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  website: z.string().url().optional().nullable().or(z.literal('')),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  currency: z.string().min(2).max(8).default('USD'),
  receiptPrefix: z.string().min(2).max(12).default('PAY'),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'La couleur doit être au format hexadécimal.').default('#3b82f6'),
});

const normalizeSettings = (data: z.infer<typeof settingsSchema>) => ({
  ...data,
  email: data.email || null,
  website: data.website || null,
  logoUrl: data.logoUrl || null,
  legalName: data.legalName || null,
  address: data.address || null,
  city: data.city || null,
  country: data.country || null,
  phone: data.phone || null,
  currency: data.currency.toUpperCase(),
  receiptPrefix: data.receiptPrefix.toUpperCase(),
});

router.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const settings = await prisma.institutionSettings.findUnique({ where: { id: 'default' } });
    res.json({ isConfigured: Boolean(settings) });
  })
);

router.post(
  '/setup',
  asyncHandler(async (req, res) => {
    const existing = await prisma.institutionSettings.findUnique({ where: { id: 'default' } });
    if (existing) throw new ApiError(409, 'La configuration initiale existe déjà.');

    const data = normalizeSettings(settingsSchema.parse(req.body));
    const settings = await prisma.institutionSettings.create({
      data: { id: 'default', ...data },
    });

    res.status(201).json(settings);
  })
);

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = await prisma.institutionSettings.findUnique({ where: { id: 'default' } });
    if (!settings) throw new ApiError(404, 'Configuration établissement introuvable.');
    res.json(settings);
  })
);

router.put(
  '/',
  requirePermission('settings:manage'),
  asyncHandler(async (req, res) => {
    const data = normalizeSettings(settingsSchema.parse(req.body));
    const settings = await prisma.institutionSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });
    await recordAudit(req, {
      action: 'UPDATE',
      module: 'Paramètres',
      entityType: 'InstitutionSettings',
      entityId: settings.id,
      description: `Configuration de l’établissement "${settings.name}" modifiée.`,
      metadata: { currency: settings.currency, receiptPrefix: settings.receiptPrefix },
    });
    res.json(settings);
  })
);

router.post(
  '/reset-data',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const password = z.object({ password: z.string().min(1) }).parse(req.body).password;
    const admin = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { password: true } });
    if (!admin || !(await bcrypt.compare(password, admin.password))) throw new ApiError(401, 'Mot de passe administrateur incorrect.');

    const deleted = await prisma.$transaction(async (tx) => {
      const payments = await tx.payment.deleteMany();
      const fees = await tx.fee.deleteMany();
      const students = await tx.student.deleteMany();
      const classes = await tx.class.deleteMany();
      const schoolYears = await tx.schoolYear.deleteMany();
      await tx.auditLog.create({
        data: {
          action: 'RESET',
          module: 'Paramètres',
          entityType: 'Database',
          description: 'Réinitialisation des données scolaires effectuée.',
          metadata: { payments: payments.count, fees: fees.count, students: students.count, classes: classes.count, schoolYears: schoolYears.count },
          userId: req.user!.id,
        },
      });
      await tx.institutionSettings.deleteMany();
      return { payments: payments.count, fees: fees.count, students: students.count, classes: classes.count, schoolYears: schoolYears.count };
    });
    res.json({ message: 'Les données ont été réinitialisées. Une nouvelle configuration est nécessaire.', setupRequired: true, deleted });
  })
);

export default router;
