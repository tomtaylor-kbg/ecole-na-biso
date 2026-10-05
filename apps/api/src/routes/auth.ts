import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ApiError } from '../lib/errors.js';
import { loginSchema, parseBody } from '../lib/validation.js';
import { signToken } from '../lib/jwt.js';

const router = Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = parseBody(loginSchema, req.body);

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      throw new ApiError(401, 'Identifiants invalides.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, 'Identifiants invalides.');
    }

    const token = signToken({
      sub: user.id,
      email: user.email ?? '',
      role: user.role,
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  })
);

export default router;
