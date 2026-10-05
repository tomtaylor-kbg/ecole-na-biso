import { z } from 'zod';

export const classSectionSchema = z.enum(['A', 'B', 'C', 'D', 'UNIQUE']);
export type ClassSection = z.infer<typeof classSectionSchema>;

export const classOrientationSchema = z.enum([
  'SCIENTIFIQUE', 'MECANIQUE', 'CYCLE_DE_BASE', 'LITTERAIRE',
  'COMMERCIALE', 'TECHNIQUE', 'GENERALE',
]);
export type ClassOrientation = z.infer<typeof classOrientationSchema>;

export const classStatusSchema = z.enum(['ACTIVE', 'ARCHIVED', 'INACTIVE']);
export type ClassStatus = z.infer<typeof classStatusSchema>;

export const roleSchema = z.enum(['ADMIN', 'CAISSIER']);
export type UserRole = z.infer<typeof roleSchema>;

export const loginSchema = z.object({
  username: z.string().min(3, 'Le nom d’utilisateur est requis.'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
}).strict();
export type LoginInput = z.infer<typeof loginSchema>;

export const classInputSchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(100),
  levelId: z.string().min(1).optional(),
  // Legacy/form compatibility: the API resolves this label to levelId.
  level: z.string().trim().min(1).optional(),
  schoolYearId: z.string().min(1),
  section: classSectionSchema.default('UNIQUE'),
  orientation: classOrientationSchema.optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  status: classStatusSchema.default('ACTIVE'),
  teacherId: z.string().min(1).optional().nullable(),
}).strict().refine((value) => Boolean(value.levelId || value.level), { message: 'Un niveau est requis.', path: ['levelId'] });
export type ClassInput = z.infer<typeof classInputSchema>;

export const feeInputSchema = z.object({
  name: z.string().min(2),
  amount: z.coerce.number().positive(),
  currency: z.string().min(2).max(8).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.string().default('active'),
  schoolYearId: z.string().min(1),
  classId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  levelId: z.string().optional().nullable(),
}).strict();
export type FeeInput = z.infer<typeof feeInputSchema>;

export type ClassDto = {
  id: string;
  code: string;
  name: string;
  levelId: string;
  section: ClassSection;
  orientation: ClassOrientation | null;
  capacity: number | null;
  status: ClassStatus;
  schoolYearId: string;
  teacherId: string | null;
};

export type FeeDto = {
  id: string;
  name: string;
  amount: string | number;
  currency: string;
  status: string;
  dueDate: string | null;
  schoolYearId: string;
  classId: string | null;
  studentId: string | null;
  levelId: string | null;
};

export const authUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  role: roleSchema,
});
export type AuthUserDto = z.infer<typeof authUserSchema>;

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  user: authUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
