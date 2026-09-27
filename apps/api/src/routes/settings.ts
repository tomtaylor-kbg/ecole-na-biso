import { Router } from 'express';
import { z } from 'zod';
import { recordAudit } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';

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

export default router;
