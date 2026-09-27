import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/errors.js';
import { verifyToken } from '../lib/jwt.js';
import { hasPermission, type Permission } from '../lib/roles.js';

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Token d\'authentification manquant ou invalide.'));
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch {
    return next(new ApiError(401, 'Session invalide ou expirée.'));
  }
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return next(new ApiError(403, 'Accès réservé à l\'administrateur.'));
  }

  return next();
};

export const requirePermission = (permission: Permission) => (req: Request, _res: Response, next: NextFunction) => {
  if (!hasPermission(req.user?.role, permission)) {
    return next(new ApiError(403, 'Permission insuffisante pour cette action.'));
  }

  return next();
};
