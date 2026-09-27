import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { recordAudit } from '../lib/audit.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/errors.js';
import { roleDefinitions, roleValues } from '../lib/roles.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

const userSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(roleValues).default('CAISSIER'),
});

const userUpdateSchema = userSchema.partial();

router.use(requirePermission('users:manage'));

router.get(
  '/roles',
  asyncHandler(async (_req, res) => {
    res.json(roleDefinitions);
  })
);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    res.json(users);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new ApiError(404, 'Utilisateur introuvable.');
    res.json(user);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = userSchema.parse(req.body);
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });

    if (existingUser) {
      throw new ApiError(409, 'Un utilisateur avec cet email existe déjà.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
    await recordAudit(req, {
      action: 'CREATE',
      module: 'Utilisateurs',
      entityType: 'User',
      entityId: user.id,
      description: `Utilisateur "${user.username}" créé.`,
      metadata: { role: user.role, email: user.email },
    });

    res.status(201).json(user);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = userUpdateSchema.parse(req.body);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.username ? [{ username: data.username }] : []),
        ],
        NOT: { id: req.params.id },
      },
    });
    if (existingUser) throw new ApiError(409, 'Cet email ou ce nom d’utilisateur est déjà utilisé.');

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...data,
        password: data.password ? await bcrypt.hash(data.password, 10) : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
    await recordAudit(req, {
      action: 'UPDATE',
      module: 'Utilisateurs',
      entityType: 'User',
      entityId: user.id,
      description: `Utilisateur "${user.username}" modifié.`,
      metadata: { role: user.role, email: user.email, passwordChanged: Boolean(data.password) },
    });
    res.json(user);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new ApiError(404, 'Utilisateur introuvable.');
    await recordAudit(req, {
      action: 'DELETE',
      module: 'Utilisateurs',
      entityType: 'User',
      entityId: user.id,
      description: `Utilisateur "${user.username}" supprimé.`,
      metadata: { role: user.role, email: user.email },
    });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
