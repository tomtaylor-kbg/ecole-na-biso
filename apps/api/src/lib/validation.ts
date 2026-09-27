import { z } from 'zod';

export const parseBody = <T>(schema: z.ZodType<T>, data: unknown) => schema.parse(data);

export const loginSchema = z.object({
  username: z.string().min(3, 'Le nom d’utilisateur est requis.'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
});
