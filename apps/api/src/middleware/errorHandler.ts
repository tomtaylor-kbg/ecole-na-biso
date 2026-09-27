import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, `Route introuvable: ${req.method} ${req.originalUrl}`));
};

const uniqueMessage = (target: unknown) => {
  const fields = Array.isArray(target) ? target : [];
  if (fields.includes('matricule')) return 'Ce matricule est déjà utilisé par un autre élève.';
  if (fields.includes('receiptNumber')) return 'Ce numéro de reçu existe déjà. Réessayez l’enregistrement.';
  if (fields.includes('username') && fields.includes('email')) return 'Ce nom d’utilisateur ou cet email est déjà utilisé.';
  if (fields.includes('username')) return 'Ce nom d’utilisateur est déjà utilisé.';
  if (fields.includes('email')) return 'Cet email est déjà utilisé.';
  return 'Un enregistrement avec ces informations existe déjà.';
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      status: 'fail',
      message: 'Données invalides.',
      issues: error.errors.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'fail',
        message: uniqueMessage(error.meta?.target),
      });
    }

    if (error.code === 'P2003') {
      return res.status(409).json({
        status: 'fail',
        message: 'Cette opération est impossible car cet élément est lié à d’autres données.',
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'fail',
        message: 'Élément introuvable.',
      });
    }
  }

  if (error instanceof Error) {
    return res.status(500).json({
      status: 'error',
      message: 'Une erreur interne du serveur s’est produite.',
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Erreur inconnue.',
  });
};
